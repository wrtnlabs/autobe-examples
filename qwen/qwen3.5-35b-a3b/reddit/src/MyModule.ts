import { Module } from "@nestjs/common";

import { RedditplatformAdminAdminsController } from "./controllers/redditPlatform/admin/admins/RedditplatformAdminAdminsController";
import { RedditplatformAdminAudit_logsController } from "./controllers/redditPlatform/admin/audit-logs/RedditplatformAdminAudit_logsController";
import { RedditplatformAdminBansController } from "./controllers/redditPlatform/admin/bans/RedditplatformAdminBansController";
import { RedditplatformAdminCircuit_breakersController } from "./controllers/redditPlatform/admin/circuit-breakers/RedditplatformAdminCircuit_breakersController";
import { RedditplatformAdminCommunitiesModeratorsController } from "./controllers/redditPlatform/admin/communities/moderators/RedditplatformAdminCommunitiesModeratorsController";
import { RedditplatformAdminDashboardController } from "./controllers/redditPlatform/admin/dashboard/RedditplatformAdminDashboardController";
import { RedditplatformAdminHistoriesController } from "./controllers/redditPlatform/admin/histories/RedditplatformAdminHistoriesController";
import { RedditplatformAdminModerationAnalyticsController } from "./controllers/redditPlatform/admin/moderation/analytics/RedditplatformAdminModerationAnalyticsController";
import { RedditplatformAdminMonitoringMetricsController } from "./controllers/redditPlatform/admin/monitoring/metrics/RedditplatformAdminMonitoringMetricsController";
import { RedditplatformAdminReportsController } from "./controllers/redditPlatform/admin/reports/RedditplatformAdminReportsController";
import { RedditplatformAdminReportsAnalyticsController } from "./controllers/redditPlatform/admin/reports/analytics/RedditplatformAdminReportsAnalyticsController";
import { RedditplatformAdminReportsDashboardController } from "./controllers/redditPlatform/admin/reports/dashboard/RedditplatformAdminReportsDashboardController";
import { RedditplatformAdminReportsMetricsController } from "./controllers/redditPlatform/admin/reports/metrics/RedditplatformAdminReportsMetricsController";
import { RedditplatformAdminReportsQueueController } from "./controllers/redditPlatform/admin/reports/queue/RedditplatformAdminReportsQueueController";
import { RedditplatformAdminReports_snapshotsController } from "./controllers/redditPlatform/admin/reports/snapshots/RedditplatformAdminReports_snapshotsController";
import { RedditplatformAdminReportsViewsController } from "./controllers/redditPlatform/admin/reports/views/RedditplatformAdminReportsViewsController";
import { RedditplatformAdminWebhooksController } from "./controllers/redditPlatform/admin/webhooks/RedditplatformAdminWebhooksController";
import { RedditplatformAuthAdminController } from "./controllers/redditPlatform/auth/admin/RedditplatformAuthAdminController";
import { RedditplatformAuthGuestController } from "./controllers/redditPlatform/auth/guest/RedditplatformAuthGuestController";
import { RedditplatformAuthMemberController } from "./controllers/redditPlatform/auth/member/RedditplatformAuthMemberController";
import { RedditplatformCommentsController } from "./controllers/redditPlatform/comments/RedditplatformCommentsController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesBansController } from "./controllers/redditPlatform/communities/bans/RedditplatformCommunitiesBansController";
import { RedditplatformCommunitiesModeratorsController } from "./controllers/redditPlatform/communities/moderators/RedditplatformCommunitiesModeratorsController";
import { RedditplatformCommunitiesSearchController } from "./controllers/redditPlatform/communities/search/RedditplatformCommunitiesSearchController";
import { RedditplatformFeedsController } from "./controllers/redditPlatform/feeds/controversial/RedditplatformFeedsController";
import { RedditplatformFeedsHotController } from "./controllers/redditPlatform/feeds/hot/RedditplatformFeedsHotController";
import { RedditplatformFeeds_newController } from "./controllers/redditPlatform/feeds/new/RedditplatformFeeds_newController";
import { RedditplatformFeedsPopularController } from "./controllers/redditPlatform/feeds/popular/RedditplatformFeedsPopularController";
import { RedditplatformFeedsTopController } from "./controllers/redditPlatform/feeds/top/RedditplatformFeedsTopController";
import { RedditplatformGuestSessionsController } from "./controllers/redditPlatform/guest/sessions/RedditplatformGuestSessionsController";
import { RedditplatformGuestsController } from "./controllers/redditPlatform/guests/RedditplatformGuestsController";
import { RedditplatformMemberBansController } from "./controllers/redditPlatform/member/bans/RedditplatformMemberBansController";
import { RedditplatformMemberCommentsController } from "./controllers/redditPlatform/member/comments/RedditplatformMemberCommentsController";
import { RedditplatformMemberCommentsVotesController } from "./controllers/redditPlatform/member/comments/votes/RedditplatformMemberCommentsVotesController";
import { RedditplatformMemberCommunitiesController } from "./controllers/redditPlatform/member/communities/RedditplatformMemberCommunitiesController";
import { RedditplatformMemberCommunitiesBansController } from "./controllers/redditPlatform/member/communities/bans/RedditplatformMemberCommunitiesBansController";
import { RedditplatformMemberCommunitiesModeratorsController } from "./controllers/redditPlatform/member/communities/moderators/RedditplatformMemberCommunitiesModeratorsController";
import { RedditplatformMemberFeedsCommunityController } from "./controllers/redditPlatform/member/feeds/community/RedditplatformMemberFeedsCommunityController";
import { RedditplatformMemberFeedsHomeController } from "./controllers/redditPlatform/member/feeds/home/RedditplatformMemberFeedsHomeController";
import { RedditplatformMemberPost_votesController } from "./controllers/redditPlatform/member/post-votes/RedditplatformMemberPost_votesController";
import { RedditplatformMemberPostsController } from "./controllers/redditPlatform/member/posts/RedditplatformMemberPostsController";
import { RedditplatformMemberPostsImagesController } from "./controllers/redditPlatform/member/posts/images/RedditplatformMemberPostsImagesController";
import { RedditplatformMemberProfileController } from "./controllers/redditPlatform/member/profile/RedditplatformMemberProfileController";
import { RedditplatformMemberProfileKarmaController } from "./controllers/redditPlatform/member/profile/karma/RedditplatformMemberProfileKarmaController";
import { RedditplatformMemberReportsController } from "./controllers/redditPlatform/member/reports/RedditplatformMemberReportsController";
import { RedditplatformMemberSubscriptionsController } from "./controllers/redditPlatform/member/subscriptions/RedditplatformMemberSubscriptionsController";
import { RedditplatformMemberUsersMeCommunitiesSubscribedController } from "./controllers/redditPlatform/member/users/me/communities/subscribed/RedditplatformMemberUsersMeCommunitiesSubscribedController";
import { RedditplatformPost_engagement_statsController } from "./controllers/redditPlatform/post-engagement-stats/RedditplatformPost_engagement_statsController";
import { RedditplatformPost_snapshotsController } from "./controllers/redditPlatform/post-snapshots/RedditplatformPost_snapshotsController";
import { RedditplatformPost_votesController } from "./controllers/redditPlatform/post-votes/RedditplatformPost_votesController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformPostsImagesController } from "./controllers/redditPlatform/posts/images/RedditplatformPostsImagesController";
import { RedditplatformUsersController } from "./controllers/redditPlatform/users/RedditplatformUsersController";
import { RedditplatformUsersPostsController } from "./controllers/redditPlatform/users/posts/RedditplatformUsersPostsController";

@Module({
  controllers: [
    RedditplatformAuthGuestController,
    RedditplatformAuthMemberController,
    RedditplatformAuthAdminController,
    RedditplatformMemberProfileController,
    RedditplatformUsersController,
    RedditplatformUsersPostsController,
    RedditplatformAdminAdminsController,
    RedditplatformAdminAudit_logsController,
    RedditplatformGuestsController,
    RedditplatformGuestSessionsController,
    RedditplatformCommunitiesController,
    RedditplatformMemberCommunitiesController,
    RedditplatformMemberSubscriptionsController,
    RedditplatformCommunitiesModeratorsController,
    RedditplatformMemberCommunitiesModeratorsController,
    RedditplatformCommunitiesBansController,
    RedditplatformMemberCommunitiesBansController,
    RedditplatformPostsController,
    RedditplatformMemberPostsController,
    RedditplatformPost_votesController,
    RedditplatformMemberPost_votesController,
    RedditplatformPost_snapshotsController,
    RedditplatformPostsImagesController,
    RedditplatformMemberPostsImagesController,
    RedditplatformPost_engagement_statsController,
    RedditplatformMemberCommentsController,
    RedditplatformMemberCommentsVotesController,
    RedditplatformCommentsController,
    RedditplatformPostsCommentsController,
    RedditplatformMemberReportsController,
    RedditplatformAdminReportsController,
    RedditplatformAdminReports_snapshotsController,
    RedditplatformAdminReportsViewsController,
    RedditplatformAdminCommunitiesModeratorsController,
    RedditplatformAdminBansController,
    RedditplatformMemberBansController,
    RedditplatformAdminHistoriesController,
    RedditplatformAdminWebhooksController,
    RedditplatformAdminCircuit_breakersController,
    RedditplatformMemberProfileKarmaController,
    RedditplatformAdminDashboardController,
    RedditplatformAdminMonitoringMetricsController,
    RedditplatformCommunitiesSearchController,
    RedditplatformMemberUsersMeCommunitiesSubscribedController,
    RedditplatformAdminReportsQueueController,
    RedditplatformAdminReportsMetricsController,
    RedditplatformAdminReportsDashboardController,
    RedditplatformAdminReportsAnalyticsController,
    RedditplatformAdminModerationAnalyticsController,
    RedditplatformMemberFeedsHomeController,
    RedditplatformFeedsPopularController,
    RedditplatformMemberFeedsCommunityController,
    RedditplatformFeedsHotController,
    RedditplatformFeedsTopController,
    RedditplatformFeeds_newController,
    RedditplatformFeedsController,
  ],
})
export class MyModule {}
