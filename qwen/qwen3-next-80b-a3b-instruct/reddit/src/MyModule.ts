import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/refresh/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorEmailVerifyController } from "./controllers/auth/moderator/email/verify/AuthModeratorEmailVerifyController";
import { AuthModeratorPasswordResetRequestController } from "./controllers/auth/moderator/password/reset/request/AuthModeratorPasswordResetRequestController";
import { AuthModeratorPasswordResetConfirmController } from "./controllers/auth/moderator/password/reset/confirm/AuthModeratorPasswordResetConfirmController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformMemberCommunitiesPostsController } from "./controllers/communityPlatform/member/communities/posts/CommunityplatformMemberCommunitiesPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformMemberPostsReactionsController } from "./controllers/communityPlatform/member/posts/reactions/CommunityplatformMemberPostsReactionsController";
import { CommunityplatformMemberCommentsReactionsController } from "./controllers/communityPlatform/member/comments/reactions/CommunityplatformMemberCommentsReactionsController";
import { CommunityplatformUsersProfileController } from "./controllers/communityPlatform/users/profile/CommunityplatformUsersProfileController";
import { CommunityplatformUsersKarmaController } from "./controllers/communityPlatform/users/karma/CommunityplatformUsersKarmaController";
import { CommunityplatformStatisticsPostsHotController } from "./controllers/communityPlatform/statistics/posts/hot/CommunityplatformStatisticsPostsHotController";
import { CommunityplatformStatisticsPosts_newController } from "./controllers/communityPlatform/statistics/posts/new/CommunityplatformStatisticsPosts_newController";
import { CommunityplatformStatisticsPostsTopController } from "./controllers/communityPlatform/statistics/posts/top/CommunityplatformStatisticsPostsTopController";
import { CommunityplatformStatisticsPostsControversialController } from "./controllers/communityPlatform/statistics/posts/controversial/CommunityplatformStatisticsPostsControversialController";
import { CommunityplatformMemberAnalyticsPost_performanceController } from "./controllers/communityPlatform/member/analytics/post-performance/CommunityplatformMemberAnalyticsPost_performanceController";
import { CommunityplatformModeratorAnalyticsPost_performanceController } from "./controllers/communityPlatform/moderator/analytics/post-performance/CommunityplatformModeratorAnalyticsPost_performanceController";
import { CommunityplatformAdminAnalyticsPost_performanceController } from "./controllers/communityPlatform/admin/analytics/post-performance/CommunityplatformAdminAnalyticsPost_performanceController";
import { CommunityplatformAdminDashboardCommunity_metricsController } from "./controllers/communityPlatform/admin/dashboard/community-metrics/CommunityplatformAdminDashboardCommunity_metricsController";
import { CommunityplatformSearchGlobalController } from "./controllers/communityPlatform/search/global/CommunityplatformSearchGlobalController";
import { CommunityplatformMemberReportsPostsController } from "./controllers/communityPlatform/member/reports/posts/CommunityplatformMemberReportsPostsController";
import { CommunityplatformMemberReportsCommentsController } from "./controllers/communityPlatform/member/reports/comments/CommunityplatformMemberReportsCommentsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformModeratorReportsActionsController } from "./controllers/communityPlatform/moderator/reports/actions/CommunityplatformModeratorReportsActionsController";
import { CommunityplatformAdminReportsActionsController } from "./controllers/communityPlatform/admin/reports/actions/CommunityplatformAdminReportsActionsController";
import { CommunityplatformMemberReportsAppealsController } from "./controllers/communityPlatform/member/reports/appeals/CommunityplatformMemberReportsAppealsController";
import { CommunityplatformMemberNotificationsController } from "./controllers/communityPlatform/member/notifications/CommunityplatformMemberNotificationsController";
import { CommunityplatformMemberCommunicationPreferencesController } from "./controllers/communityPlatform/member/communication/preferences/CommunityplatformMemberCommunicationPreferencesController";
import { CommunityplatformAdminDashboardReporting_overviewController } from "./controllers/communityPlatform/admin/dashboard/reporting-overview/CommunityplatformAdminDashboardReporting_overviewController";
import { CommunityplatformAdminCommunicationTemplatesController } from "./controllers/communityPlatform/admin/communication/templates/CommunityplatformAdminCommunicationTemplatesController";
import { CommunityplatformMemberStatisticsReporting_trendsController } from "./controllers/communityPlatform/member/statistics/reporting-trends/CommunityplatformMemberStatisticsReporting_trendsController";
import { CommunityplatformAdminStatisticsReporting_trendsController } from "./controllers/communityPlatform/admin/statistics/reporting-trends/CommunityplatformAdminStatisticsReporting_trendsController";
import { CommunityplatformModeratorAnalyticsReporting_escalationsController } from "./controllers/communityPlatform/moderator/analytics/reporting-escalations/CommunityplatformModeratorAnalyticsReporting_escalationsController";
import { CommunityplatformAdminAnalyticsReporting_escalationsController } from "./controllers/communityPlatform/admin/analytics/reporting-escalations/CommunityplatformAdminAnalyticsReporting_escalationsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthModeratorEmailVerifyController,
    AuthModeratorPasswordResetRequestController,
    AuthModeratorPasswordResetConfirmController,
    CommunityplatformCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformMemberCommunitiesPostsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformMemberPostsReactionsController,
    CommunityplatformMemberCommentsReactionsController,
    CommunityplatformUsersProfileController,
    CommunityplatformUsersKarmaController,
    CommunityplatformStatisticsPostsHotController,
    CommunityplatformStatisticsPosts_newController,
    CommunityplatformStatisticsPostsTopController,
    CommunityplatformStatisticsPostsControversialController,
    CommunityplatformMemberAnalyticsPost_performanceController,
    CommunityplatformModeratorAnalyticsPost_performanceController,
    CommunityplatformAdminAnalyticsPost_performanceController,
    CommunityplatformAdminDashboardCommunity_metricsController,
    CommunityplatformSearchGlobalController,
    CommunityplatformMemberReportsPostsController,
    CommunityplatformMemberReportsCommentsController,
    CommunityplatformMemberReportsController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformModeratorReportsActionsController,
    CommunityplatformAdminReportsActionsController,
    CommunityplatformMemberReportsAppealsController,
    CommunityplatformMemberNotificationsController,
    CommunityplatformMemberCommunicationPreferencesController,
    CommunityplatformAdminDashboardReporting_overviewController,
    CommunityplatformAdminCommunicationTemplatesController,
    CommunityplatformMemberStatisticsReporting_trendsController,
    CommunityplatformAdminStatisticsReporting_trendsController,
    CommunityplatformModeratorAnalyticsReporting_escalationsController,
    CommunityplatformAdminAnalyticsReporting_escalationsController,
  ],
})
export class MyModule {}
