import { Module } from "@nestjs/common";

import { RedditplatformAdminAdminsController } from "./controllers/redditPlatform/admin/admins/RedditplatformAdminAdminsController";
import { RedditplatformAdminAnalyticsCommunitiesController } from "./controllers/redditPlatform/admin/analytics/communities/RedditplatformAdminAnalyticsCommunitiesController";
import { RedditplatformAdminAnalyticsPostsController } from "./controllers/redditPlatform/admin/analytics/posts/RedditplatformAdminAnalyticsPostsController";
import { RedditplatformAdminAnalyticsReportsController } from "./controllers/redditPlatform/admin/analytics/reports/RedditplatformAdminAnalyticsReportsController";
import { RedditplatformAdminAudit_logsController } from "./controllers/redditPlatform/admin/audit-logs/RedditplatformAdminAudit_logsController";
import { RedditplatformAdminAuditAnalyticsController } from "./controllers/redditPlatform/admin/audit/analytics/RedditplatformAdminAuditAnalyticsController";
import { RedditplatformAdminCommunitiesBansController } from "./controllers/redditPlatform/admin/communities/bans/RedditplatformAdminCommunitiesBansController";
import { RedditplatformAdminCommunitiesModeration_audit_logsController } from "./controllers/redditPlatform/admin/communities/moderation-audit-logs/RedditplatformAdminCommunitiesModeration_audit_logsController";
import { RedditplatformAdminCommunitiesModerator_historiesController } from "./controllers/redditPlatform/admin/communities/moderator-histories/RedditplatformAdminCommunitiesModerator_historiesController";
import { RedditplatformAdminCommunitiesModeratorsController } from "./controllers/redditPlatform/admin/communities/moderators/RedditplatformAdminCommunitiesModeratorsController";
import { RedditplatformAdminDashboardController } from "./controllers/redditPlatform/admin/dashboard/RedditplatformAdminDashboardController";
import { RedditplatformAdminHealthController } from "./controllers/redditPlatform/admin/health/external/RedditplatformAdminHealthController";
import { RedditplatformAdminMonitoringCircuit_breakersController } from "./controllers/redditPlatform/admin/monitoring/circuit-breakers/RedditplatformAdminMonitoringCircuit_breakersController";
import { RedditplatformAdminReportsController } from "./controllers/redditPlatform/admin/reports/RedditplatformAdminReportsController";
import { RedditplatformAdminReportsSloController } from "./controllers/redditPlatform/admin/reports/slo/RedditplatformAdminReportsSloController";
import { RedditplatformAdminReportsSnapshotsController } from "./controllers/redditPlatform/admin/reports/snapshots/RedditplatformAdminReportsSnapshotsController";
import { RedditplatformAdminReportsViewsController } from "./controllers/redditPlatform/admin/reports/views/RedditplatformAdminReportsViewsController";
import { RedditplatformAuthAdminController } from "./controllers/redditPlatform/auth/admin/RedditplatformAuthAdminController";
import { RedditplatformAuthGuestController } from "./controllers/redditPlatform/auth/guest/RedditplatformAuthGuestController";
import { RedditplatformAuthMemberController } from "./controllers/redditPlatform/auth/member/RedditplatformAuthMemberController";
import { RedditplatformCommentsController } from "./controllers/redditPlatform/comments/RedditplatformCommentsController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesSearchController } from "./controllers/redditPlatform/communities/search/RedditplatformCommunitiesSearchController";
import { RedditplatformGuestCommunitiesPostsFeedController } from "./controllers/redditPlatform/guest/communities/posts/feed/RedditplatformGuestCommunitiesPostsFeedController";
import { RedditplatformGuestPostsFeedPopularController } from "./controllers/redditPlatform/guest/posts/feed/popular/RedditplatformGuestPostsFeedPopularController";
import { RedditplatformGuestPostsSearchController } from "./controllers/redditPlatform/guest/posts/search/RedditplatformGuestPostsSearchController";
import { RedditplatformGuestsController } from "./controllers/redditPlatform/guests/RedditplatformGuestsController";
import { RedditplatformMemberCommentsController } from "./controllers/redditPlatform/member/comments/RedditplatformMemberCommentsController";
import { RedditplatformMemberCommentsVoteController } from "./controllers/redditPlatform/member/comments/vote/RedditplatformMemberCommentsVoteController";
import { RedditplatformMemberCommunitiesController } from "./controllers/redditPlatform/member/communities/RedditplatformMemberCommunitiesController";
import { RedditplatformMemberCommunitiesBansController } from "./controllers/redditPlatform/member/communities/bans/RedditplatformMemberCommunitiesBansController";
import { RedditplatformMemberCommunitiesModeration_audit_logsController } from "./controllers/redditPlatform/member/communities/moderation-audit-logs/RedditplatformMemberCommunitiesModeration_audit_logsController";
import { RedditplatformMemberCommunitiesModerationQueueController } from "./controllers/redditPlatform/member/communities/moderation/queue/RedditplatformMemberCommunitiesModerationQueueController";
import { RedditplatformMemberCommunitiesModerator_historiesController } from "./controllers/redditPlatform/member/communities/moderator-histories/RedditplatformMemberCommunitiesModerator_historiesController";
import { RedditplatformMemberCommunitiesModeratorsController } from "./controllers/redditPlatform/member/communities/moderators/RedditplatformMemberCommunitiesModeratorsController";
import { RedditplatformMemberCommunitiesPostsFeedController } from "./controllers/redditPlatform/member/communities/posts/feed/RedditplatformMemberCommunitiesPostsFeedController";
import { RedditplatformMemberPostsController } from "./controllers/redditPlatform/member/posts/RedditplatformMemberPostsController";
import { RedditplatformMemberPostsFeedHomeController } from "./controllers/redditPlatform/member/posts/feed/home/RedditplatformMemberPostsFeedHomeController";
import { RedditplatformMemberPostsFeedPopularController } from "./controllers/redditPlatform/member/posts/feed/popular/RedditplatformMemberPostsFeedPopularController";
import { RedditplatformMemberPostsImagesController } from "./controllers/redditPlatform/member/posts/images/RedditplatformMemberPostsImagesController";
import { RedditplatformMemberPostsSearchController } from "./controllers/redditPlatform/member/posts/search/RedditplatformMemberPostsSearchController";
import { RedditplatformMemberPostsVoteController } from "./controllers/redditPlatform/member/posts/vote/RedditplatformMemberPostsVoteController";
import { RedditplatformMemberProfileController } from "./controllers/redditPlatform/member/profile/RedditplatformMemberProfileController";
import { RedditplatformMemberReportsController } from "./controllers/redditPlatform/member/reports/RedditplatformMemberReportsController";
import { RedditplatformMemberReportsAnalyticsController } from "./controllers/redditPlatform/member/reports/analytics/RedditplatformMemberReportsAnalyticsController";
import { RedditplatformMemberReportsDashboardController } from "./controllers/redditPlatform/member/reports/dashboard/RedditplatformMemberReportsDashboardController";
import { RedditplatformMemberReportsQueueController } from "./controllers/redditPlatform/member/reports/queue/RedditplatformMemberReportsQueueController";
import { RedditplatformMemberReportsSnapshotsController } from "./controllers/redditPlatform/member/reports/snapshots/RedditplatformMemberReportsSnapshotsController";
import { RedditplatformMemberSessionsController } from "./controllers/redditPlatform/member/sessions/RedditplatformMemberSessionsController";
import { RedditplatformMemberSubscriptionsController } from "./controllers/redditPlatform/member/subscriptions/RedditplatformMemberSubscriptionsController";
import { RedditplatformMembersController } from "./controllers/redditPlatform/members/RedditplatformMembersController";
import { RedditplatformPost_engagement_statsController } from "./controllers/redditPlatform/post-engagement-stats/RedditplatformPost_engagement_statsController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformPosts_snapshotsController } from "./controllers/redditPlatform/posts/snapshots/RedditplatformPosts_snapshotsController";

@Module({
  controllers: [
    RedditplatformAuthGuestController,
    RedditplatformAuthMemberController,
    RedditplatformAuthAdminController,
    RedditplatformMembersController,
    RedditplatformMemberProfileController,
    RedditplatformMemberSessionsController,
    RedditplatformGuestsController,
    RedditplatformAdminAdminsController,
    RedditplatformAdminAudit_logsController,
    RedditplatformCommunitiesController,
    RedditplatformMemberCommunitiesController,
    RedditplatformMemberSubscriptionsController,
    RedditplatformMemberCommunitiesModeratorsController,
    RedditplatformMemberCommunitiesBansController,
    RedditplatformPostsController,
    RedditplatformMemberPostsController,
    RedditplatformMemberPostsVoteController,
    RedditplatformPosts_snapshotsController,
    RedditplatformMemberPostsImagesController,
    RedditplatformPostsCommentsController,
    RedditplatformCommentsController,
    RedditplatformMemberCommentsController,
    RedditplatformMemberCommentsVoteController,
    RedditplatformMemberReportsController,
    RedditplatformAdminReportsController,
    RedditplatformMemberReportsSnapshotsController,
    RedditplatformAdminReportsSnapshotsController,
    RedditplatformAdminReportsViewsController,
    RedditplatformAdminCommunitiesModeratorsController,
    RedditplatformAdminCommunitiesModeration_audit_logsController,
    RedditplatformMemberCommunitiesModeration_audit_logsController,
    RedditplatformAdminCommunitiesModerator_historiesController,
    RedditplatformMemberCommunitiesModerator_historiesController,
    RedditplatformAdminCommunitiesBansController,
    RedditplatformPost_engagement_statsController,
    RedditplatformCommunitiesSearchController,
    RedditplatformGuestPostsFeedPopularController,
    RedditplatformMemberPostsFeedPopularController,
    RedditplatformGuestCommunitiesPostsFeedController,
    RedditplatformMemberCommunitiesPostsFeedController,
    RedditplatformGuestPostsSearchController,
    RedditplatformMemberPostsSearchController,
    RedditplatformMemberPostsFeedHomeController,
    RedditplatformMemberReportsDashboardController,
    RedditplatformMemberReportsAnalyticsController,
    RedditplatformMemberReportsQueueController,
    RedditplatformMemberCommunitiesModerationQueueController,
    RedditplatformAdminDashboardController,
    RedditplatformAdminAnalyticsPostsController,
    RedditplatformAdminAnalyticsReportsController,
    RedditplatformAdminAnalyticsCommunitiesController,
    RedditplatformAdminMonitoringCircuit_breakersController,
    RedditplatformAdminReportsSloController,
    RedditplatformAdminHealthController,
    RedditplatformAdminAuditAnalyticsController,
  ],
})
export class MyModule {}
