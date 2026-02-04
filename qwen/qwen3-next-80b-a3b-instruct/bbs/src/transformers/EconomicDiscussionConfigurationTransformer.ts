import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicDiscussionConfigurationTransformer {
  export type Payload = Prisma.economic_discussion_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        search_enabled: true,
        article_search_threshold: true,
        search_result_limit: true,
        file_upload_enabled: true,
        max_file_size_mb: true,
        max_files_per_article: true,
        comment_enabled: true,
        min_comment_length: true,
        max_comment_length: true,
        admin_request_enabled: true,
        ban_reason_required: true,
        max_sessions_per_user: true,
        session_expiry_hours: true,
        cache_enabled: true,
        cache_ttl_seconds: true,
        maintenance_mode: true,
        email_notification_enabled: true,
        email_smtp_host: true,
        email_smtp_port: true,
        email_smtp_username: true,
        email_sender_name: true,
        email_sender_address: true,
        search_trigram_enabled: true,
        search_fuzzy_threshold: true,
        auto_archive_old_comments: true,
        auto_archive_days: true,
        max_articles_per_section: true,
        max_tags_per_article: true,
        auto_tag_suggestions: true,
        rate_limit_requests_per_minute: true,
        rate_limit_login_attempts: true,
        max_admin_actions_per_minute: true,
        audit_logs_enabled: true,
        audit_log_retention_days: true,
        data_retention_enabled: true,
        content_backups_enabled: true,
        backup_retention_days: true,
        feature_flag_new_ui: true,
        feature_flag_api_v2: true,
        feature_flag_community_moderation: true,
        feature_flag_ai_recommendations: true,
        feature_flag_dark_mode: true,
        feature_flag_language_support: true,
        feature_flag_mobile_app: true,
        feature_flag_email_digest: true,
        feature_flag_emoji_reactions: true,
        feature_flag_pinned_articles: true,
        feature_flag_topic_following: true,
        feature_flag_user_badges: true,
        feature_flag_search_history: true,
        feature_flag_profile_views: true,
        feature_flag_privacy_mode: true,
        economic_discussion_component_statuses: true,
      },
    } satisfies Prisma.economic_discussion_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicDiscussionConfiguration> {
    return {
      content: "", // Dummy value as it doesn't exist in config
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      author: { id: "" }, // Dummy value as it doesn't exist in config
      article: {
        id: "",
        title: "",
        created_at: "",
        comment_count: 0,
        tags: [],
      }, // Dummy value as it doesn't exist in config
      id: input.id,
      // Map all configuration fields to dotted property names
      searchEnabled: input.search_enabled,
      articleSearchThreshold: input.article_search_threshold,
      searchResultLimit: input.search_result_limit,
      fileUploadEnabled: input.file_upload_enabled,
      maxFileSizeMb: input.max_file_size_mb,
      maxFilesPerArticle: input.max_files_per_article,
      commentEnabled: input.comment_enabled,
      minCommentLength: input.min_comment_length,
      maxCommentLength: input.max_comment_length,
      adminRequestEnabled: input.admin_request_enabled,
      banReasonRequired: input.ban_reason_required,
      maxSessionsPerUser: input.max_sessions_per_user,
      sessionExpiryHours: input.session_expiry_hours,
      cacheEnabled: input.cache_enabled,
      cacheTtlSeconds: input.cache_ttl_seconds,
      maintenanceMode: input.maintenance_mode,
      emailNotificationEnabled: input.email_notification_enabled,
      emailSmtpHost: input.email_smtp_host,
      emailSmtpPort: input.email_smtp_port,
      emailSmtpUsername: input.email_smtp_username,
      emailSenderName: input.email_sender_name,
      emailSenderAddress: input.email_sender_address,
      searchTrigramEnabled: input.search_trigram_enabled,
      searchFuzzyThreshold: input.search_fuzzy_threshold,
      autoArchiveOldComments: input.auto_archive_old_comments,
      autoArchiveDays: input.auto_archive_days,
      maxArticlesPerSection: input.max_articles_per_section,
      maxTagsPerArticle: input.max_tags_per_article,
      autoTagSuggestions: input.auto_tag_suggestions,
      rateLimitRequestsPerMinute: input.rate_limit_requests_per_minute,
      rateLimitLoginAttempts: input.rate_limit_login_attempts,
      maxAdminActionsPerMinute: input.max_admin_actions_per_minute,
      auditLogsEnabled: input.audit_logs_enabled,
      auditLogRetentionDays: input.audit_log_retention_days,
      dataRetentionEnabled: input.data_retention_enabled,
      contentBackupsEnabled: input.content_backups_enabled,
      backupRetentionDays: input.backup_retention_days,
      featureFlagNewUi: input.feature_flag_new_ui,
      featureFlagApiV2: input.feature_flag_api_v2,
      featureFlagCommunityModeration: input.feature_flag_community_moderation,
      featureFlagAiRecommendations: input.feature_flag_ai_recommendations,
      featureFlagDarkMode: input.feature_flag_dark_mode,
      featureFlagLanguageSupport: input.feature_flag_language_support,
      featureFlagMobileApp: input.feature_flag_mobile_app,
      featureFlagEmailDigest: input.feature_flag_email_digest,
      featureFlagEmojiReactions: input.feature_flag_emoji_reactions,
      featureFlagPinnedArticles: input.feature_flag_pinned_articles,
      featureFlagTopicFollowing: input.feature_flag_topic_following,
      featureFlagUserBadges: input.feature_flag_user_badges,
      featureFlagSearchHistory: input.feature_flag_search_history,
      featureFlagProfileViews: input.feature_flag_profile_views,
      featureFlagPrivacyMode: input.feature_flag_privacy_mode,
    };
  }
}
