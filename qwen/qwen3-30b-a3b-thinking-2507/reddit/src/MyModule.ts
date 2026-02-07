import { Module } from "@nestjs/common";

import { CommunityplatformAdminBansController } from "./controllers/communityPlatform/admin/bans/CommunityplatformAdminBansController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformAdminReportsResolutionsController } from "./controllers/communityPlatform/admin/reports/resolutions/CommunityplatformAdminReportsResolutionsController";
import { CommunityplatformAdminResolutionsController } from "./controllers/communityPlatform/admin/resolutions/CommunityplatformAdminResolutionsController";
import { CommunityplatformAdminSystemConfigsController } from "./controllers/communityPlatform/admin/system/configs/CommunityplatformAdminSystemConfigsController";
import { CommunityplatformAdminSystemLogsController } from "./controllers/communityPlatform/admin/system/logs/CommunityplatformAdminSystemLogsController";
import { CommunityplatformAdminSystemLogsAnalyticsController } from "./controllers/communityPlatform/admin/system/logs/analytics/CommunityplatformAdminSystemLogsAnalyticsController";
import { CommunityplatformAdminSystemLogs_exportController } from "./controllers/communityPlatform/admin/system/logs/export/CommunityplatformAdminSystemLogs_exportController";
import { CommunityplatformAdminSystemMetricsController } from "./controllers/communityPlatform/admin/system/metrics/CommunityplatformAdminSystemMetricsController";
import { CommunityplatformAdminSystemMetricsSummaryController } from "./controllers/communityPlatform/admin/system/metrics/summary/CommunityplatformAdminSystemMetricsSummaryController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesSearchController } from "./controllers/communityPlatform/communities/search/CommunityplatformCommunitiesSearchController";
import { CommunityplatformFeed_cachesController } from "./controllers/communityPlatform/feed-caches/CommunityplatformFeed_cachesController";
import { CommunityplatformGuestFeedPopularController } from "./controllers/communityPlatform/guest/feed/popular/CommunityplatformGuestFeedPopularController";
import { CommunityplatformGuestGuestSessionsController } from "./controllers/communityPlatform/guest/guest/sessions/CommunityplatformGuestGuestSessionsController";
import { CommunityplatformMemberCommentsEditsController } from "./controllers/communityPlatform/member/comments/edits/CommunityplatformMemberCommentsEditsController";
import { CommunityplatformMemberCommentsThreadController } from "./controllers/communityPlatform/member/comments/thread/CommunityplatformMemberCommentsThreadController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesSubscriptionsController } from "./controllers/communityPlatform/member/communities/subscriptions/CommunityplatformMemberCommunitiesSubscriptionsController";
import { CommunityplatformMemberFeedHomeController } from "./controllers/communityPlatform/member/feed/home/CommunityplatformMemberFeedHomeController";
import { CommunityplatformMemberFeedsController } from "./controllers/communityPlatform/member/feeds/CommunityplatformMemberFeedsController";
import { CommunityplatformMemberKarma_scoresController } from "./controllers/communityPlatform/member/karma-scores/CommunityplatformMemberKarma_scoresController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformMemberVotesSnapshotsController } from "./controllers/communityPlatform/member/votes/snapshots/CommunityplatformMemberVotesSnapshotsController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsImagesController } from "./controllers/communityPlatform/posts/images/CommunityplatformPostsImagesController";
import { CommunityplatformPostsLinksController } from "./controllers/communityPlatform/posts/links/CommunityplatformPostsLinksController";
import { CommunityplatformPostsSnapshotsController } from "./controllers/communityPlatform/posts/snapshots/CommunityplatformPostsSnapshotsController";
import { CommunityplatformPostsTextController } from "./controllers/communityPlatform/posts/text/CommunityplatformPostsTextController";
import { CommunityplatformReport_categoriesController } from "./controllers/communityPlatform/report-categories/CommunityplatformReport_categoriesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthAdminController,
    CommunityplatformGuestGuestSessionsController,
    CommunityplatformMembersController,
    CommunityplatformMemberProfileController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformMemberCommunitiesSubscriptionsController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformPostsTextController,
    CommunityplatformPostsLinksController,
    CommunityplatformPostsImagesController,
    CommunityplatformPostsSnapshotsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformMemberCommentsEditsController,
    CommunityplatformMemberVotesController,
    CommunityplatformMemberVotesSnapshotsController,
    CommunityplatformMemberKarma_scoresController,
    CommunityplatformFeed_cachesController,
    CommunityplatformReport_categoriesController,
    CommunityplatformMemberReportsController,
    CommunityplatformAdminBansController,
    CommunityplatformAdminResolutionsController,
    CommunityplatformAdminSystemConfigsController,
    CommunityplatformAdminSystemLogsController,
    CommunityplatformAdminSystemMetricsController,
    CommunityplatformCommunitiesSearchController,
    CommunityplatformMemberFeedHomeController,
    CommunityplatformGuestFeedPopularController,
    CommunityplatformMemberCommentsThreadController,
    CommunityplatformMemberFeedsController,
    CommunityplatformAdminReportsController,
    CommunityplatformAdminReportsResolutionsController,
    CommunityplatformAdminSystemLogsAnalyticsController,
    CommunityplatformAdminSystemLogs_exportController,
    CommunityplatformAdminSystemMetricsSummaryController,
  ],
})
export class MyModule {}
