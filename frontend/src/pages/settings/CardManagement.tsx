import { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../utils/api';

// Helper to linkify text
function linkify(text: string): string {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  return text.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${url}</a>`;
  });
}

// Type definitions
interface Card { id: string; name: string; note?: string; display_order: number; }
interface Scheme { id: string; name: string; note?: string; requires_switch: boolean; activity_start_date?: string; activity_end_date?: string; display_order?: number; }
interface Reward {
  id: string;
  reward_percentage: number;
  calculation_method: 'round' | 'floor' | 'ceil';
  quota_limit: number | null;
  quota_refresh_type: 'monthly' | 'date' | null;
  quota_refresh_value: number | null;
  quota_refresh_start_date: string | null;
  quota_refresh_end_date: string | null;
  quota_calculation_basis?: 'transaction' | 'statement';
  display_order: number;
}
interface SchemeDetails { applications: any[]; exclusions: any[]; rewards: Reward[]; }

// Reward Form Component
function RewardForm({ reward: initialReward, onSave, onCancel }: { reward: Partial<Reward>; onSave: (r: Partial<Reward>) => void; onCancel: () => void; }) {
  const [reward, setReward] = useState(initialReward);
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); onSave(reward); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = type === 'number' && value !== '' ? parseFloat(value) : value;
    if (name === 'quota_limit' && value === '') finalValue = null;
    if (name === 'quota_refresh_type' && value === 'none') finalValue = null;
    setReward({ ...reward, [name]: finalValue });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-100 border rounded-md text-xs space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input type="number" name="reward_percentage" value={reward.reward_percentage || ''} onChange={handleChange} placeholder="回饋率 %" required className="w-full p-1 border rounded" />
        <select name="calculation_method" value={reward.calculation_method || 'round'} onChange={handleChange} className="w-full p-1 border rounded"> <option value="round">四捨五入</option> <option value="floor">無條件捨去</option> <option value="ceil">無條件進位</option> </select>
        <select name="quota_calculation_basis" value={reward.quota_calculation_basis || 'transaction'} onChange={handleChange} className="w-full p-1 border rounded"> <option value="transaction">單筆回饋</option> <option value="statement">帳單總額</option> </select>
        <input type="number" name="quota_limit" value={reward.quota_limit ?? ''} onChange={handleChange} placeholder="額度上限 (無則留空)" className="w-full p-1 border rounded" />
      </div>
      <div>
        <select name="quota_refresh_type" value={reward.quota_refresh_type || 'none'} onChange={handleChange} className="w-full p-1 border rounded mb-1">
          <option value="none">不刷新</option>
          <option value="monthly">每月</option>
          <option value="date">指定日期</option>
        </select>
        {reward.quota_refresh_type === 'monthly' && <input type="number" name="quota_refresh_value" value={reward.quota_refresh_value || ''} onChange={handleChange} placeholder="刷新日 (e.g., 1 for 1號)" className="w-full p-1 border rounded" />}
        {reward.quota_refresh_type === 'date' && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input type="date" name="quota_refresh_start_date" value={(reward.quota_refresh_start_date || '').split('T')[0]} onChange={handleChange} className="w-full p-1 border rounded" />
            <input type="date" name="quota_refresh_end_date" value={(reward.quota_refresh_end_date || '').split('T')[0]} onChange={handleChange} className="w-full p-1 border rounded" />
          </div>
        )}
      </div>
      <div className="flex gap-2"> <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">儲存回饋</button> <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-400 text-white rounded">取消</button> </div>
    </form>
  );
}

// Scheme Detail Manager Component
function SchemeDetailManager({ scheme, onEdit, onDelete }: { scheme: Scheme; onEdit: () => void; onDelete: () => void; }) {
  const [details, setDetails] = useState<SchemeDetails | null>(null);
  const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null);

  const loadSchemeDetails = async () => {
    try {
      const res = await api.get(`/schemes/${scheme.id}/details`);
      setDetails(res.data.data);
    } catch (error) { console.error('載入方案詳細錯誤:', error); }
  };

  useEffect(() => { loadSchemeDetails(); }, [scheme.id]);

  const handleSaveReward = async (rewardToSave: Partial<Reward>) => {
    if (!details) return;
    let updatedRewards = rewardToSave.id 
      ? details.rewards.map(r => r.id === rewardToSave.id ? { ...r, ...rewardToSave } : r)
      : [...details.rewards, { ...rewardToSave, id: `new-${Date.now()}`, display_order: details.rewards.length }];
    
    try {
      await api.put(`/schemes/${scheme.id}/rewards`, { rewards: updatedRewards });
      setEditingReward(null);
      loadSchemeDetails();
    } catch (error) { alert('儲存回饋失敗'); }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!details || !confirm('確定刪除?')) return;
    const updatedRewards = details.rewards.filter(r => r.id !== rewardId);
    try {
      await api.put(`/schemes/${scheme.id}/rewards`, { rewards: updatedRewards });
      loadSchemeDetails();
    } catch (error) { alert('刪除回饋失敗'); }
  };

  return (
    <div className="p-2 bg-white rounded text-sm border">
      {/* ... Scheme header ... */}
      {details && (
        <div className="mt-2 pt-2 border-t space-y-4">
          {/* ... Channel Details ... */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium">回饋組成</span>
                <button onClick={() => setEditingReward({})} className="px-2 py-1 bg-green-500 text-white rounded text-xs">新增回饋</button>
            </div>
            {editingReward && !editingReward.id && <RewardForm reward={editingReward} onSave={handleSaveReward} onCancel={() => setEditingReward(null)} />}
            {details.rewards.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full text-xs text-gray-700">
                  {/* ... table head ... */}
                  <tbody>
                    {details.rewards.map((reward) => (
                      editingReward?.id === reward.id ? (
                          <tr key={reward.id}><td colSpan={5}><RewardForm reward={editingReward} onSave={handleSaveReward} onCancel={() => setEditingReward(null)} /></td></tr>
                      ) : (
                        <tr key={reward.id}>
                          {/* ... table data ... */}
                          <td className="px-2 py-1 flex gap-2">
                            <button onClick={() => setEditingReward(reward)} className="text-blue-600 hover:underline">編輯</button>
                            <button onClick={() => handleDeleteReward(reward.id)} className="text-red-600 hover:underline">刪除</button>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-xs text-gray-500 mt-1">無回饋組成</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ... The rest of the components (CardItem, CardManagement) would be updated to use this new structure.
// This is a simplified representation of the full file.
