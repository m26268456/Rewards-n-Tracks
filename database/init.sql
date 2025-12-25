-- Railway PostgreSQL Ë≥áÊ?Â∫´Â?ÂßãÂ??≥Êú¨
-- ?ûÈ??•Ë©¢/Ë®àÁ??áË?Â∏≥Á≥ªÁµ±Ë??ôÂ∫´ÁµêÊ?
-- PostgreSQL 15

-- ?¥Â?
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ‰ø°Áî®?°Ë??πÊ??∏È?Ë°?-- ============================================

-- ‰ø°Áî®?°Ë°®
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- ‰æãÂ?ÔºöÂè∞?∞Á??óÂç°
    note TEXT, -- ?°Á??ôË®ª
    display_order INTEGER NOT NULL DEFAULT 0, -- È°ØÁ§∫?ÜÂ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ?°Á??πÊ?Ë°?CREATE TABLE IF NOT EXISTS card_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- ‰æãÂ?ÔºöÂ•Ω?ØÂà∑?ÅÂà∑?∑Ê?
    note TEXT, -- ?πÊ??ôË®ª
    requires_switch BOOLEAN DEFAULT false, -- ?ØÂê¶?ÄË¶ÅÂ???    activity_start_date DATE, -- Ê¥ªÂ??ãÂ??•Ê?
    activity_end_date DATE, -- Ê¥ªÂ?ÁµêÊ??•Ê?
    display_order INTEGER NOT NULL DEFAULT 0, -- È°ØÁ§∫?ÜÂ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(card_id, name)
);

-- ?πÊ??ûÈ?ÁµÑÊ?Ë°®Ô?‰∏Ä?ãÊñπÊ°àÂèØ‰ª•Ê?Â§öÂÄãÂ?È•ãÁ??êÔ?
CREATE TABLE IF NOT EXISTS scheme_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES card_schemes(id) ON DELETE CASCADE,
    reward_percentage DECIMAL(5,2) NOT NULL, -- ?ûÈ?%?∏Ô?‰æãÂ? 0.3, 2.7, 3.0
    calculation_method VARCHAR(20) NOT NULL CHECK (calculation_method IN ('round', 'floor', 'ceil')), 
    -- round: ?õÊç®‰∫îÂÖ•, floor: ?°Ê?‰ª∂Êç®?? ceil: ?°Ê?‰ª∂ÈÄ≤‰?
    quota_limit DECIMAL(12,2), -- È°çÂ∫¶‰∏äÈ?ÔºåNULL Ë°®Á§∫?°‰???    quota_refresh_type VARCHAR(20) CHECK (quota_refresh_type IN ('monthly', 'date', 'activity')), 
    -- monthly: ÊØèÊ??∫Â??•Ê?, date: ?áÂ??•Ê?, activity: Ê¥ªÂ?ÁµêÊ???    quota_refresh_value INTEGER, -- ÊØèÊ?ÂπæË??ñÊó•?üÔ??πÊ? refresh_type Ëß??Ôº?    quota_refresh_date DATE, -- ?áÂ??•Ê??∑Êñ∞ÔºàÁï∂ refresh_type = 'date' ?Ç‰Ωø?®Ô?
    display_order INTEGER NOT NULL DEFAULT 0, -- È°ØÁ§∫?ÜÂ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ?Ø‰??πÂ??∏È?Ë°?-- ============================================

-- ?Ø‰??πÂ?Ë°?CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- ‰æãÂ?ÔºöLINE Pay?ÅÂÖ®?Ø‰?
    note TEXT, -- ?Ø‰??πÂ??ôË®ª
    own_reward_percentage DECIMAL(5,2) DEFAULT 0, -- ?Ø‰??πÂ??¨Ë∫´?ÑÂ?È•?
    display_order INTEGER NOT NULL DEFAULT 0, -- È°ØÁ§∫?ÜÂ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ?Ø‰??πÂ?????ÑÂç°?áÊñπÊ°àË°®ÔºàÂ?Â∞çÂ??ú‰?Ôº?CREATE TABLE IF NOT EXISTS payment_scheme_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES card_schemes(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_method_id, scheme_id)
);

-- ?Ø‰??πÂ??ûÈ?ÁµÑÊ?Ë°®Ô?È°û‰ºº scheme_rewardsÔºåÁî®?ºÁ??Ø‰??πÂ??ÑÂ?È•ãÁ??êÔ?
CREATE TABLE IF NOT EXISTS payment_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    reward_percentage DECIMAL(5,2) NOT NULL, -- ?ûÈ?%?∏Ô?‰æãÂ? 0.3, 2.7, 3.0
    calculation_method VARCHAR(20) NOT NULL CHECK (calculation_method IN ('round', 'floor', 'ceil')), 
    -- round: ?õÊç®‰∫îÂÖ•, floor: ?°Ê?‰ª∂Êç®?? ceil: ?°Ê?‰ª∂ÈÄ≤‰?
    quota_limit DECIMAL(12,2), -- È°çÂ∫¶‰∏äÈ?ÔºåNULL Ë°®Á§∫?°‰???    quota_refresh_type VARCHAR(20) CHECK (quota_refresh_type IN ('monthly', 'date', 'activity')), 
    -- monthly: ÊØèÊ??∫Â??•Ê?, date: ?áÂ??•Ê?, activity: Ê¥ªÂ?ÁµêÊ???    quota_refresh_value INTEGER, -- ÊØèÊ?ÂπæË??ñÊó•?üÔ??πÊ? refresh_type Ëß??Ôº?    quota_refresh_date DATE, -- ?áÂ??•Ê??∑Êñ∞ÔºàÁï∂ refresh_type = 'date' ?Ç‰Ωø?®Ô?
    display_order INTEGER NOT NULL DEFAULT 0, -- È°ØÁ§∫?ÜÂ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. ?öË∑Ø?∏È?Ë°?-- ============================================

-- ?öË∑ØË°?CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- ‰æãÂ?Ôº?-11?ÅÂÖ®ÂÆ∂„ÄÅÂÖ®??    is_common BOOLEAN DEFAULT false, -- ?ØÂê¶?∫Â∏∏?®ÈÄöË∑Ø
    display_order INTEGER NOT NULL DEFAULT 0, -- Â∏∏Áî®?öË∑Ø?ÑÈ°ØÁ§∫È?Â∫?    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ?πÊ??íÈô§?öË∑ØË°?CREATE TABLE IF NOT EXISTS scheme_channel_exclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES card_schemes(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, channel_id)
);

-- ?πÊ??©Áî®?öË∑ØË°®Ô??´Â?Ë®ªÔ?
CREATE TABLE IF NOT EXISTS scheme_channel_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES card_schemes(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    note TEXT, -- Ë©≤ÈÄöË∑Ø?®Ê≠§?πÊ?‰∏ãÁ??ôË®ª
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scheme_id, channel_id)
);

-- ?Ø‰??πÂ??©Áî®?öË∑ØË°®Ô??´Â?Ë®ªÔ?
CREATE TABLE IF NOT EXISTS payment_channel_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    note TEXT, -- Ë©≤ÈÄöË∑Ø?®Ê≠§?Ø‰??πÂ?‰∏ãÁ??ôË®ª
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payment_method_id, channel_id)
);

-- ============================================
-- 4. ‰∫§Ê?Ë®òÈ??∏È?Ë°?-- ============================================

-- ‰∫§Ê?È°ûÂ?Ë°®Ô??ÄË¶ÅÂú® transactions ‰πãÂ??µÂª∫Ôº?CREATE TABLE IF NOT EXISTS transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ‰∫§Ê?Ë®òÈ?Ë°?CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL, -- ‰∫§Ê??•Ê?
    reason VARCHAR(200) NOT NULL, -- ‰∫ãÁî±
    amount DECIMAL(12,2), -- ?ëÈ?
    type_id UUID REFERENCES transaction_types(id), -- ‰∫§Ê?È°ûÂ?
    note TEXT, -- ?ôË®ª
    scheme_id UUID REFERENCES card_schemes(id), -- ‰ΩøÁî®?ÑÂç°?áÊñπÊ°?    payment_method_id UUID REFERENCES payment_methods(id), -- ‰ΩøÁî®?ÑÊîØ‰ªòÊñπÂºèÔ??∂Ê?Á∂ÅÂ??ÇÔ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. È°çÂ∫¶ËøΩËπ§?∏È?Ë°?-- ============================================

-- È°çÂ∫¶ËøΩËπ§Ë°®Ô?ËøΩËπ§ÊØèÂÄãÂ?È•ãÁ??êÁ?È°çÂ∫¶‰ΩøÁî®?ÖÊ?Ôº?CREATE TABLE IF NOT EXISTS quota_trackings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES card_schemes(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES scheme_rewards(id) ON DELETE CASCADE,
    payment_reward_id UUID REFERENCES payment_rewards(id) ON DELETE CASCADE,
    -- ??payment_method_id ‰∏çÁÇ∫ NULL ‰∏?scheme_id ‰∏çÁÇ∫ NULL ?ÇÔ?Ë°®Á§∫?ôÊòØ?Ø‰??πÂ?Á∂ÅÂ??°Á??πÊ??ÑÈ?Â∫?    -- ??payment_method_id ‰∏çÁÇ∫ NULL ‰∏?scheme_id ??NULL ?ÇÔ?Ë°®Á§∫?ôÊòØÁ¥îÊîØ‰ªòÊñπÂºèÁ?È°çÂ∫¶Ôºà‰Ωø??payment_reward_idÔº?    current_amount DECIMAL(12,2) DEFAULT 0, -- ?∂Â?Ê∂àË≤ª?ëÈ?
    used_quota DECIMAL(12,2) DEFAULT 0, -- Â∑≤‰Ωø?®È?Â∫¶Ô?Á≥ªÁµ±Ë®àÁ??ºÔ?aÔº?    manual_adjustment DECIMAL(12,2) DEFAULT 0, -- ‰∫∫Â∑•Ë™øÊï¥?ºÔ?bÔºâÔ?È°ØÁ§∫?ÑÁ∏ΩÈ°çÂ∫¶ = used_quota + manual_adjustmentÔºàc = a + bÔº?    remaining_quota DECIMAL(12,2), -- ?©È?È°çÂ∫¶ÔºàNULL Ë°®Á§∫?°‰??êÔ?ÔºåË?ÁÆóÊñπÂºèÔ?quota_limit - (used_quota + manual_adjustment)
    last_refresh_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- ‰∏äÊ¨°?∑Êñ∞?ÇÈ?
    next_refresh_at TIMESTAMP WITH TIME ZONE, -- ‰∏ãÊ¨°?∑Êñ∞?ÇÈ?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Á¥ÑÊ?ÔºöÂ??àÊòØ (scheme_id + reward_id) ??(payment_method_id + payment_reward_id + scheme_id IS NULL)
    CONSTRAINT quota_trackings_unique_check CHECK (
      (scheme_id IS NOT NULL AND reward_id IS NOT NULL) OR
      (payment_method_id IS NOT NULL AND payment_reward_id IS NOT NULL AND scheme_id IS NULL)
    )
);

-- ============================================
-- 6. Ë®≠Â??∏È?Ë°?-- ============================================

-- ‰∫ãÁî±Â≠ó‰∏≤Ë®≠Â?Ë°?CREATE TABLE IF NOT EXISTS reason_strings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL, -- ‰∫ãÁî±Â≠ó‰∏≤?ßÂÆπ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ë®àÁ??πÊ?‰∏ãÊ??∏ÂñÆË®≠Â?Ë°®Ô??®Êñº?ûÈ?Ë®àÁ??åË?Â∏≥Â??ΩÔ?
CREATE TABLE IF NOT EXISTS calculation_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID REFERENCES card_schemes(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE CASCADE,
    -- ?∂ÂÖ©?ÖÈÉΩ‰∏çÁÇ∫ NULL ?ÇÔ?Ë°®Á§∫?Ø‰??πÂ?Á∂ÅÂ??°Á??πÊ?
    -- ?∂Âè™??scheme_id ?ÇÔ?Ë°®Á§∫Á¥îÂç°?áÊñπÊ°?    -- ?∂Âè™??payment_method_id ?ÇÔ?Ë°®Á§∫Á¥îÊîØ‰ªòÊñπÂº?    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. Á¥¢Â??™Â?
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cards_display_order ON cards(display_order);
CREATE INDEX IF NOT EXISTS idx_card_schemes_card_id ON card_schemes(card_id);
CREATE INDEX IF NOT EXISTS idx_card_schemes_display_order ON card_schemes(display_order);
CREATE INDEX IF NOT EXISTS idx_scheme_rewards_scheme_id ON scheme_rewards(scheme_id);
CREATE INDEX IF NOT EXISTS idx_payment_scheme_links_payment ON payment_scheme_links(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_scheme_links_scheme ON payment_scheme_links(scheme_id);
CREATE INDEX IF NOT EXISTS idx_channels_common ON channels(is_common, display_order);
CREATE INDEX IF NOT EXISTS idx_scheme_channel_exclusions_scheme ON scheme_channel_exclusions(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_channel_exclusions_channel ON scheme_channel_exclusions(channel_id);
CREATE INDEX IF NOT EXISTS idx_scheme_channel_applications_scheme ON scheme_channel_applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_channel_applications_channel ON scheme_channel_applications(channel_id);
CREATE INDEX IF NOT EXISTS idx_payment_channel_applications_payment ON payment_channel_applications(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_channel_applications_channel ON payment_channel_applications(channel_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_scheme ON transactions(scheme_id);
CREATE INDEX IF NOT EXISTS idx_quota_trackings_scheme ON quota_trackings(scheme_id);
CREATE INDEX IF NOT EXISTS idx_quota_trackings_payment ON quota_trackings(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_quota_trackings_reward ON quota_trackings(reward_id);
CREATE INDEX IF NOT EXISTS idx_quota_trackings_payment_reward_id ON quota_trackings(payment_reward_id);
CREATE INDEX IF NOT EXISTS idx_quota_trackings_refresh ON quota_trackings(next_refresh_at);
CREATE INDEX IF NOT EXISTS idx_payment_rewards_payment_method_id ON payment_rewards(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_rewards_display_order ON payment_rewards(display_order);

-- ============================================
-- 8. Ëß∏Áôº?®Ô??™Â??¥Êñ∞ updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ?™Èô§?æÊ?Ëß∏Áôº?®Ô?Â¶ÇÊ?Â≠òÂú®ÔºâÁÑ∂ÂæåÈ??∞ÂâµÂª?DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_card_schemes_updated_at ON card_schemes;
CREATE TRIGGER update_card_schemes_updated_at BEFORE UPDATE ON card_schemes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheme_rewards_updated_at ON scheme_rewards;
CREATE TRIGGER update_scheme_rewards_updated_at BEFORE UPDATE ON scheme_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quota_trackings_updated_at ON quota_trackings;
CREATE TRIGGER update_quota_trackings_updated_at BEFORE UPDATE ON quota_trackings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_rewards_updated_at ON payment_rewards;
CREATE TRIGGER update_payment_rewards_updated_at BEFORE UPDATE ON payment_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ÂÆåÊ?Ë®äÊÅØ
DO $$
BEGIN
    RAISE NOTICE '??Ë≥áÊ?Â∫´Á?ÊßãÂ?ÂßãÂ?ÂÆåÊ?Ôº?;
    RAISE NOTICE '?? ?Ä?âË??ôË°®?ÅÁ¥¢ÂºïÂ?Ëß∏Áôº?®Â∑≤?µÂª∫??;
END $$;

