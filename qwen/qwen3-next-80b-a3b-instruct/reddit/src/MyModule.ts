import { Module } from "@nestjs/common";

import { CommunityAdminAnalyticsController } from "./controllers/community/admin/analytics/CommunityAdminAnalyticsController";
import { CommunityAdminAnalyticsCommunitiesController } from "./controllers/community/admin/analytics/communities/CommunityAdminAnalyticsCommunitiesController";
import { CommunityAdminAnalyticsUsageController } from "./controllers/community/admin/analytics/usage/CommunityAdminAnalyticsUsageController";
import { CommunityAdminApi_keysController } from "./controllers/community/admin/api-keys/CommunityAdminApi_keysController";
import { CommunityAdminAudit_logsController } from "./controllers/community/admin/audit-logs/CommunityAdminAudit_logsController";
import { CommunityAdminAuditSystem_configsController } from "./controllers/community/admin/audit/system-configs/CommunityAdminAuditSystem_configsController";
import { CommunityAdminBansController } from "./controllers/community/admin/bans/CommunityAdminBansController";
import { CommunityAdminCommentsController } from "./controllers/community/admin/comments/CommunityAdminCommentsController";
import { CommunityAdminCommentsReportsController } from "./controllers/community/admin/comments/reports/CommunityAdminCommentsReportsController";
import { CommunityAdminCommentsVote_summaryController } from "./controllers/community/admin/comments/vote-summary/CommunityAdminCommentsVote_summaryController";
import { CommunityAdminCommunitiesController } from "./controllers/community/admin/communities/CommunityAdminCommunitiesController";
import { CommunityAdminCommunitiesBanned_usersController } from "./controllers/community/admin/communities/banned-users/CommunityAdminCommunitiesBanned_usersController";
import { CommunityAdminCommunitiesMetricsController } from "./controllers/community/admin/communities/metrics/CommunityAdminCommunitiesMetricsController";
import { CommunityAdminCrypto_keysController } from "./controllers/community/admin/crypto-keys/CommunityAdminCrypto_keysController";
import { CommunityAdminDashboardHealthController } from "./controllers/community/admin/dashboard/health/CommunityAdminDashboardHealthController";
import { CommunityAdminFeedCacheController } from "./controllers/community/admin/feed/cache/CommunityAdminFeedCacheController";
import { CommunityAdminFeedCommunityController } from "./controllers/community/admin/feed/community/CommunityAdminFeedCommunityController";
import { CommunityAdminKarmaController } from "./controllers/community/admin/karma/CommunityAdminKarmaController";
import { CommunityAdminKarmaHistoryController } from "./controllers/community/admin/karma/history/CommunityAdminKarmaHistoryController";
import { CommunityAdminMaintenance_configsController } from "./controllers/community/admin/maintenance-configs/CommunityAdminMaintenance_configsController";
import { CommunityAdminMaintenanceStatusController } from "./controllers/community/admin/maintenance/status/CommunityAdminMaintenanceStatusController";
import { CommunityAdminMembersActivityController } from "./controllers/community/admin/members/activity/CommunityAdminMembersActivityController";
import { CommunityAdminMigration_historiesController } from "./controllers/community/admin/migration-histories/CommunityAdminMigration_historiesController";
import { CommunityAdminPlatform_metadataController } from "./controllers/community/admin/platform-metadata/CommunityAdminPlatform_metadataController";
import { CommunityAdminPostsControversialController } from "./controllers/community/admin/posts/controversial/CommunityAdminPostsControversialController";
import { CommunityAdminPostsHotController } from "./controllers/community/admin/posts/hot/CommunityAdminPostsHotController";
import { CommunityAdminPosts_newController } from "./controllers/community/admin/posts/new/CommunityAdminPosts_newController";
import { CommunityAdminPostsStatusController } from "./controllers/community/admin/posts/status/CommunityAdminPostsStatusController";
import { CommunityAdminPostsTopController } from "./controllers/community/admin/posts/top/CommunityAdminPostsTopController";
import { CommunityAdminReportsController } from "./controllers/community/admin/reports/CommunityAdminReportsController";
import { CommunityAdminService_statusesController } from "./controllers/community/admin/service-statuses/CommunityAdminService_statusesController";
import { CommunityAdminServiceOverviewController } from "./controllers/community/admin/service/overview/CommunityAdminServiceOverviewController";
import { CommunityAdminSystem_configsController } from "./controllers/community/admin/system-configs/CommunityAdminSystem_configsController";
import { CommunityAdminSystem_messagesController } from "./controllers/community/admin/system-messages/CommunityAdminSystem_messagesController";
import { CommunityAdminUsage_metricsController } from "./controllers/community/admin/usage-metrics/CommunityAdminUsage_metricsController";
import { CommunityAdminUsersKarmaController } from "./controllers/community/admin/users/karma/CommunityAdminUsersKarmaController";
import { CommunityAdminUsersKarmaHistoryController } from "./controllers/community/admin/users/karma/history/CommunityAdminUsersKarmaHistoryController";
import { CommunityAdminsController } from "./controllers/community/admins/CommunityAdminsController";
import { CommunityAuthAdminController } from "./controllers/community/auth/admin/CommunityAuthAdminController";
import { CommunityAuthGuestController } from "./controllers/community/auth/guest/CommunityAuthGuestController";
import { CommunityAuthMemberController } from "./controllers/community/auth/member/CommunityAuthMemberController";
import { CommunityAuthModeratorController } from "./controllers/community/auth/moderator/CommunityAuthModeratorController";
import { CommunityCommentsSortsController } from "./controllers/community/comments/sorts/CommunityCommentsSortsController";
import { CommunityCommentsThreadsController } from "./controllers/community/comments/threads/CommunityCommentsThreadsController";
import { CommunityCommentsVote_summariesController } from "./controllers/community/comments/vote-summaries/CommunityCommentsVote_summariesController";
import { CommunityCommunitiesController } from "./controllers/community/communities/CommunityCommunitiesController";
import { CommunityCommunity_feedsController } from "./controllers/community/community-feeds/CommunityCommunity_feedsController";
import { CommunityFeed_cache_entriesController } from "./controllers/community/feed-cache-entries/CommunityFeed_cache_entriesController";
import { CommunityFeedPopularController } from "./controllers/community/feed/popular/CommunityFeedPopularController";
import { CommunityGuestCommunitiesSubscriber_countController } from "./controllers/community/guest/communities/subscriber-count/CommunityGuestCommunitiesSubscriber_countController";
import { CommunityGuestProfileController } from "./controllers/community/guest/profile/CommunityGuestProfileController";
import { CommunityGuestReportsController } from "./controllers/community/guest/reports/CommunityGuestReportsController";
import { CommunityGuestsController } from "./controllers/community/guests/CommunityGuestsController";
import { CommunityMemberCommentsController } from "./controllers/community/member/comments/CommunityMemberCommentsController";
import { CommunityMemberCommentsVote_summaryController } from "./controllers/community/member/comments/vote-summary/CommunityMemberCommentsVote_summaryController";
import { CommunityMemberCommunitiesController } from "./controllers/community/member/communities/CommunityMemberCommunitiesController";
import { CommunityMemberDashboardController } from "./controllers/community/member/dashboard/CommunityMemberDashboardController";
import { CommunityMemberFeedCommunityController } from "./controllers/community/member/feed/community/CommunityMemberFeedCommunityController";
import { CommunityMemberFeedHomeController } from "./controllers/community/member/feed/home/CommunityMemberFeedHomeController";
import { CommunityMemberKarmaController } from "./controllers/community/member/karma/CommunityMemberKarmaController";
import { CommunityMemberKarmaHistoryController } from "./controllers/community/member/karma/history/CommunityMemberKarmaHistoryController";
import { CommunityMemberPostsController } from "./controllers/community/member/posts/CommunityMemberPostsController";
import { CommunityMemberPostsControversialController } from "./controllers/community/member/posts/controversial/CommunityMemberPostsControversialController";
import { CommunityMemberPostsHotController } from "./controllers/community/member/posts/hot/CommunityMemberPostsHotController";
import { CommunityMemberPosts_newController } from "./controllers/community/member/posts/new/CommunityMemberPosts_newController";
import { CommunityMemberPostsTopController } from "./controllers/community/member/posts/top/CommunityMemberPostsTopController";
import { CommunityMemberReportsController } from "./controllers/community/member/reports/CommunityMemberReportsController";
import { CommunityMemberSubscriptionsController } from "./controllers/community/member/subscriptions/CommunityMemberSubscriptionsController";
import { CommunityMemberVotesController } from "./controllers/community/member/votes/CommunityMemberVotesController";
import { CommunityMembersController } from "./controllers/community/members/CommunityMembersController";
import { CommunityModeratorAnalyticsCommunitiesController } from "./controllers/community/moderator/analytics/communities/CommunityModeratorAnalyticsCommunitiesController";
import { CommunityModeratorAudit_logsController } from "./controllers/community/moderator/audit-logs/CommunityModeratorAudit_logsController";
import { CommunityModeratorBansController } from "./controllers/community/moderator/bans/CommunityModeratorBansController";
import { CommunityModeratorCommentsController } from "./controllers/community/moderator/comments/CommunityModeratorCommentsController";
import { CommunityModeratorCommentsReportsController } from "./controllers/community/moderator/comments/reports/CommunityModeratorCommentsReportsController";
import { CommunityModeratorCommentsVote_summaryController } from "./controllers/community/moderator/comments/vote-summary/CommunityModeratorCommentsVote_summaryController";
import { CommunityModeratorCommunitiesController } from "./controllers/community/moderator/communities/CommunityModeratorCommunitiesController";
import { CommunityModeratorCommunitiesBanned_usersController } from "./controllers/community/moderator/communities/banned-users/CommunityModeratorCommunitiesBanned_usersController";
import { CommunityModeratorKarmaController } from "./controllers/community/moderator/karma/CommunityModeratorKarmaController";
import { CommunityModeratorKarmaHistoryController } from "./controllers/community/moderator/karma/history/CommunityModeratorKarmaHistoryController";
import { CommunityModeratorPostsStatusController } from "./controllers/community/moderator/posts/status/CommunityModeratorPostsStatusController";
import { CommunityModeratorReportsController } from "./controllers/community/moderator/reports/CommunityModeratorReportsController";
import { CommunityModeratorsController } from "./controllers/community/moderators/CommunityModeratorsController";
import { CommunityPopular_feedsController } from "./controllers/community/popular-feeds/CommunityPopular_feedsController";
import { CommunityPost_feed_indicesController } from "./controllers/community/post-feed-indices/CommunityPost_feed_indicesController";
import { CommunityPost_feedsController } from "./controllers/community/post-feeds/CommunityPost_feedsController";
import { CommunityPostsController } from "./controllers/community/posts/CommunityPostsController";
import { CommunityPostsComment_countController } from "./controllers/community/posts/comment-count/CommunityPostsComment_countController";
import { CommunityPostsEditsController } from "./controllers/community/posts/edits/CommunityPostsEditsController";
import { CommunityPostsFeed_entriesController } from "./controllers/community/posts/feed-entries/CommunityPostsFeed_entriesController";
import { CommunityPostsImageController } from "./controllers/community/posts/image/CommunityPostsImageController";
import { CommunityPostsLinkController } from "./controllers/community/posts/link/CommunityPostsLinkController";
import { CommunityPostsStatusController } from "./controllers/community/posts/status/CommunityPostsStatusController";
import { CommunityPostsTextController } from "./controllers/community/posts/text/CommunityPostsTextController";
import { CommunityPostsView_statsController } from "./controllers/community/posts/view-stats/CommunityPostsView_statsController";

@Module({
  controllers: [
    CommunityAuthGuestController,
    CommunityAuthMemberController,
    CommunityAuthModeratorController,
    CommunityAuthAdminController,
    CommunityGuestsController,
    CommunityGuestProfileController,
    CommunityMembersController,
    CommunityModeratorsController,
    CommunityAdminsController,
    CommunityAdminSystem_configsController,
    CommunityAdminPlatform_metadataController,
    CommunityAdminApi_keysController,
    CommunityAdminMigration_historiesController,
    CommunityAdminService_statusesController,
    CommunityAdminMaintenance_configsController,
    CommunityAdminSystem_messagesController,
    CommunityAdminUsage_metricsController,
    CommunityAdminCrypto_keysController,
    CommunityCommunitiesController,
    CommunityMemberCommunitiesController,
    CommunityModeratorCommunitiesController,
    CommunityAdminCommunitiesController,
    CommunityModeratorCommunitiesBanned_usersController,
    CommunityAdminCommunitiesBanned_usersController,
    CommunityMemberPostsController,
    CommunityPostsController,
    CommunityPostsTextController,
    CommunityPostsLinkController,
    CommunityPostsImageController,
    CommunityPostsEditsController,
    CommunityPostsComment_countController,
    CommunityPostsView_statsController,
    CommunityPostsFeed_entriesController,
    CommunityPostsStatusController,
    CommunityModeratorPostsStatusController,
    CommunityAdminPostsStatusController,
    CommunityMemberVotesController,
    CommunityFeed_cache_entriesController,
    CommunityPost_feed_indicesController,
    CommunityCommunity_feedsController,
    CommunityPopular_feedsController,
    CommunityPost_feedsController,
    CommunityMemberCommentsController,
    CommunityModeratorCommentsController,
    CommunityAdminCommentsController,
    CommunityCommentsVote_summariesController,
    CommunityModeratorReportsController,
    CommunityAdminReportsController,
    CommunityModeratorBansController,
    CommunityAdminBansController,
    CommunityModeratorAudit_logsController,
    CommunityAdminAudit_logsController,
    CommunityMemberKarmaController,
    CommunityModeratorKarmaController,
    CommunityAdminKarmaController,
    CommunityMemberKarmaHistoryController,
    CommunityModeratorKarmaHistoryController,
    CommunityAdminKarmaHistoryController,
    CommunityMemberSubscriptionsController,
    CommunityMemberDashboardController,
    CommunityAdminAnalyticsController,
    CommunityAdminMembersActivityController,
    CommunityAdminCommunitiesMetricsController,
    CommunityAdminDashboardHealthController,
    CommunityAdminAnalyticsUsageController,
    CommunityAdminAuditSystem_configsController,
    CommunityAdminMaintenanceStatusController,
    CommunityAdminServiceOverviewController,
    CommunityAdminAnalyticsCommunitiesController,
    CommunityModeratorAnalyticsCommunitiesController,
    CommunityMemberPostsHotController,
    CommunityAdminPostsHotController,
    CommunityMemberPosts_newController,
    CommunityAdminPosts_newController,
    CommunityMemberPostsTopController,
    CommunityAdminPostsTopController,
    CommunityMemberPostsControversialController,
    CommunityAdminPostsControversialController,
    CommunityMemberFeedHomeController,
    CommunityFeedPopularController,
    CommunityMemberFeedCommunityController,
    CommunityAdminFeedCommunityController,
    CommunityAdminFeedCacheController,
    CommunityCommentsSortsController,
    CommunityModeratorCommentsReportsController,
    CommunityAdminCommentsReportsController,
    CommunityCommentsThreadsController,
    CommunityMemberCommentsVote_summaryController,
    CommunityModeratorCommentsVote_summaryController,
    CommunityAdminCommentsVote_summaryController,
    CommunityGuestReportsController,
    CommunityMemberReportsController,
    CommunityAdminUsersKarmaController,
    CommunityAdminUsersKarmaHistoryController,
    CommunityGuestCommunitiesSubscriber_countController,
  ],
})
export class MyModule {}
