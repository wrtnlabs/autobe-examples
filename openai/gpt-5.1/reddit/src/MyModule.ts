import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { CommunityplatformAdminuserSystemconfigsController } from "./controllers/communityPlatform/adminUser/systemConfigs/CommunityplatformAdminuserSystemconfigsController";
import { CommunityplatformAdminuserRatelimitbucketsController } from "./controllers/communityPlatform/adminUser/rateLimitBuckets/CommunityplatformAdminuserRatelimitbucketsController";
import { CommunityplatformAdminuserAuditlogsController } from "./controllers/communityPlatform/adminUser/auditLogs/CommunityplatformAdminuserAuditlogsController";
import { CommunityplatformAdminuserErrorlogsController } from "./controllers/communityPlatform/adminUser/errorLogs/CommunityplatformAdminuserErrorlogsController";
import { CommunityplatformAdminuserErrorlogsOverviewController } from "./controllers/communityPlatform/adminUser/errorLogs/overview/CommunityplatformAdminuserErrorlogsOverviewController";
import { CommunityplatformAdminuserGuestusersController } from "./controllers/communityPlatform/adminUser/guestUsers/CommunityplatformAdminuserGuestusersController";
import { CommunityplatformAdminuserMemberusersController } from "./controllers/communityPlatform/adminUser/memberUsers/CommunityplatformAdminuserMemberusersController";
import { CommunityplatformMemberuserMemberusersController } from "./controllers/communityPlatform/memberUser/memberUsers/CommunityplatformMemberuserMemberusersController";
import { CommunityplatformAdminuserMemberusersSessionsController } from "./controllers/communityPlatform/adminUser/memberUsers/sessions/CommunityplatformAdminuserMemberusersSessionsController";
import { CommunityplatformAdminuserAdminusersController } from "./controllers/communityPlatform/adminUser/adminUsers/CommunityplatformAdminuserAdminusersController";
import { CommunityplatformAdminuserAdminusersSessionsController } from "./controllers/communityPlatform/adminUser/adminUsers/sessions/CommunityplatformAdminuserAdminusersSessionsController";
import { CommunityplatformAdminuserAccountrestrictionsController } from "./controllers/communityPlatform/adminUser/accountRestrictions/CommunityplatformAdminuserAccountrestrictionsController";
import { CommunityplatformAdminuserMemberusersAccountrestrictionsController } from "./controllers/communityPlatform/adminUser/memberUsers/accountRestrictions/CommunityplatformAdminuserMemberusersAccountrestrictionsController";
import { CommunityplatformAdminuserAdminusersAccountrestrictionsController } from "./controllers/communityPlatform/adminUser/adminUsers/accountRestrictions/CommunityplatformAdminuserAdminusersAccountrestrictionsController";
import { CommunityplatformAdminuserPasswordresettokensController } from "./controllers/communityPlatform/adminUser/passwordResetTokens/CommunityplatformAdminuserPasswordresettokensController";
import { CommunityplatformAdminuserLoginattemptsController } from "./controllers/communityPlatform/adminUser/loginAttempts/CommunityplatformAdminuserLoginattemptsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberuserCommunitiesController } from "./controllers/communityPlatform/memberUser/communities/CommunityplatformMemberuserCommunitiesController";
import { CommunityplatformAdminuserCommunitiesController } from "./controllers/communityPlatform/adminUser/communities/CommunityplatformAdminuserCommunitiesController";
import { CommunityplatformMemberuserCommunitiesRulesController } from "./controllers/communityPlatform/memberUser/communities/rules/CommunityplatformMemberuserCommunitiesRulesController";
import { CommunityplatformAdminuserCommunitiesRulesController } from "./controllers/communityPlatform/adminUser/communities/rules/CommunityplatformAdminuserCommunitiesRulesController";
import { CommunityplatformAdminuserCommunitiesMembershipsController } from "./controllers/communityPlatform/adminUser/communities/memberships/CommunityplatformAdminuserCommunitiesMembershipsController";
import { CommunityplatformMemberuserCommunitiesMembershipsController } from "./controllers/communityPlatform/memberUser/communities/memberships/CommunityplatformMemberuserCommunitiesMembershipsController";
import { CommunityplatformAdminuserCommunitiesStatushistoriesController } from "./controllers/communityPlatform/adminUser/communities/statusHistories/CommunityplatformAdminuserCommunitiesStatushistoriesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberuserPostsController } from "./controllers/communityPlatform/memberUser/posts/CommunityplatformMemberuserPostsController";
import { CommunityplatformAdminuserPostsController } from "./controllers/communityPlatform/adminUser/posts/CommunityplatformAdminuserPostsController";
import { CommunityplatformAdminuserPostsLockController } from "./controllers/communityPlatform/adminUser/posts/lock/CommunityplatformAdminuserPostsLockController";
import { CommunityplatformMemberuserPostsCommentsController } from "./controllers/communityPlatform/memberUser/posts/comments/CommunityplatformMemberuserPostsCommentsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformAdminuserPostsCommentsController } from "./controllers/communityPlatform/adminUser/posts/comments/CommunityplatformAdminuserPostsCommentsController";
import { CommunityplatformMemberuserPostsCommentsRepliesController } from "./controllers/communityPlatform/memberUser/posts/comments/replies/CommunityplatformMemberuserPostsCommentsRepliesController";
import { CommunityplatformPostsCommentsRepliesController } from "./controllers/communityPlatform/posts/comments/replies/CommunityplatformPostsCommentsRepliesController";
import { CommunityplatformAdminuserPostsCommentsRepliesController } from "./controllers/communityPlatform/adminUser/posts/comments/replies/CommunityplatformAdminuserPostsCommentsRepliesController";
import { CommunityplatformMemberuserPostsEdithistoriesController } from "./controllers/communityPlatform/memberUser/posts/editHistories/CommunityplatformMemberuserPostsEdithistoriesController";
import { CommunityplatformAdminuserPostsEdithistoriesController } from "./controllers/communityPlatform/adminUser/posts/editHistories/CommunityplatformAdminuserPostsEdithistoriesController";
import { CommunityplatformMemberuserCommentsEdithistoriesController } from "./controllers/communityPlatform/memberUser/comments/editHistories/CommunityplatformMemberuserCommentsEdithistoriesController";
import { CommunityplatformCommentsEdithistoriesController } from "./controllers/communityPlatform/comments/editHistories/CommunityplatformCommentsEdithistoriesController";
import { CommunityplatformMemberuserFeedsPostsController } from "./controllers/communityPlatform/memberUser/feeds/posts/CommunityplatformMemberuserFeedsPostsController";
import { CommunityplatformThreadsController } from "./controllers/communityPlatform/threads/CommunityplatformThreadsController";
import { CommunityplatformSearchPostsController } from "./controllers/communityPlatform/search/posts/CommunityplatformSearchPostsController";
import { CommunityplatformSearchCommentsController } from "./controllers/communityPlatform/search/comments/CommunityplatformSearchCommentsController";
import { CommunityplatformAdminuserAnalyticsPostsController } from "./controllers/communityPlatform/adminUser/analytics/posts/CommunityplatformAdminuserAnalyticsPostsController";
import { CommunityplatformAdminuserAnalyticsCommentsController } from "./controllers/communityPlatform/adminUser/analytics/comments/CommunityplatformAdminuserAnalyticsCommentsController";
import { CommunityplatformMemberuserPostsVotesController } from "./controllers/communityPlatform/memberUser/posts/votes/CommunityplatformMemberuserPostsVotesController";
import { CommunityplatformCommentsVotesController } from "./controllers/communityPlatform/comments/votes/CommunityplatformCommentsVotesController";
import { CommunityplatformMemberuserCommentsVotesController } from "./controllers/communityPlatform/memberUser/comments/votes/CommunityplatformMemberuserCommentsVotesController";
import { CommunityplatformAdminuserUserkarmasController } from "./controllers/communityPlatform/adminUser/userKarmas/CommunityplatformAdminuserUserkarmasController";
import { CommunityplatformUserkarmasBymemberuserController } from "./controllers/communityPlatform/userKarmas/byMemberUser/CommunityplatformUserkarmasBymemberuserController";
import { CommunityplatformAdminuserKarmaeventsController } from "./controllers/communityPlatform/adminUser/karmaEvents/CommunityplatformAdminuserKarmaeventsController";
import { CommunityplatformAdminuserStatisticsKarmaSummaryController } from "./controllers/communityPlatform/adminUser/statistics/karma/summary/CommunityplatformAdminuserStatisticsKarmaSummaryController";
import { CommunityplatformAdminuserStatisticsKarmaByuserController } from "./controllers/communityPlatform/adminUser/statistics/karma/byUser/CommunityplatformAdminuserStatisticsKarmaByuserController";
import { CommunityplatformAdminuserStatisticsKarmaBycontentController } from "./controllers/communityPlatform/adminUser/statistics/karma/byContent/CommunityplatformAdminuserStatisticsKarmaBycontentController";
import { CommunityplatformAdminuserAnalyticsVotesTrendsController } from "./controllers/communityPlatform/adminUser/analytics/votes/trends/CommunityplatformAdminuserAnalyticsVotesTrendsController";
import { CommunityplatformAdminuserAnalyticsVotesAbusesignalsController } from "./controllers/communityPlatform/adminUser/analytics/votes/abuseSignals/CommunityplatformAdminuserAnalyticsVotesAbusesignalsController";
import { CommunityplatformMemberuserAnalyticsKarmaEvolutionController } from "./controllers/communityPlatform/memberUser/analytics/karma/evolution/CommunityplatformMemberuserAnalyticsKarmaEvolutionController";
import { CommunityplatformMemberuserSubscriptionsController } from "./controllers/communityPlatform/memberUser/subscriptions/CommunityplatformMemberuserSubscriptionsController";
import { CommunityplatformMemberuserMembersSubscriptionsController } from "./controllers/communityPlatform/memberUser/members/subscriptions/CommunityplatformMemberuserMembersSubscriptionsController";
import { CommunityplatformCommunitiesSubscribersController } from "./controllers/communityPlatform/communities/subscribers/CommunityplatformCommunitiesSubscribersController";
import { CommunityplatformAdminuserCommunitiesSubscribersController } from "./controllers/communityPlatform/adminUser/communities/subscribers/CommunityplatformAdminuserCommunitiesSubscribersController";
import { CommunityplatformProfilesController } from "./controllers/communityPlatform/profiles/CommunityplatformProfilesController";
import { CommunityplatformMemberuserProfilesController } from "./controllers/communityPlatform/memberUser/profiles/CommunityplatformMemberuserProfilesController";
import { CommunityplatformProfilesPublicviewController } from "./controllers/communityPlatform/profiles/publicView/CommunityplatformProfilesPublicviewController";
import { CommunityplatformProfilesAchievementsController } from "./controllers/communityPlatform/profiles/achievements/CommunityplatformProfilesAchievementsController";
import { CommunityplatformAdminuserProfilesAchievementsController } from "./controllers/communityPlatform/adminUser/profiles/achievements/CommunityplatformAdminuserProfilesAchievementsController";
import { CommunityplatformMemberuserProfilesSettingsController } from "./controllers/communityPlatform/memberUser/profiles/settings/CommunityplatformMemberuserProfilesSettingsController";
import { CommunityplatformAdminuserPostreportsController } from "./controllers/communityPlatform/adminUser/postReports/CommunityplatformAdminuserPostreportsController";
import { CommunityplatformMemberuserPostreportsController } from "./controllers/communityPlatform/memberUser/postReports/CommunityplatformMemberuserPostreportsController";
import { CommunityplatformAdminuserCommentreportsController } from "./controllers/communityPlatform/adminUser/commentReports/CommunityplatformAdminuserCommentreportsController";
import { CommunityplatformMemberuserCommentreportsController } from "./controllers/communityPlatform/memberUser/commentReports/CommunityplatformMemberuserCommentreportsController";
import { CommunityplatformAdminuserCommunityreportsController } from "./controllers/communityPlatform/adminUser/communityReports/CommunityplatformAdminuserCommunityreportsController";
import { CommunityplatformMemberuserCommunityreportsController } from "./controllers/communityPlatform/memberUser/communityReports/CommunityplatformMemberuserCommunityreportsController";
import { CommunityplatformAdminuserUserreportsController } from "./controllers/communityPlatform/adminUser/userReports/CommunityplatformAdminuserUserreportsController";
import { CommunityplatformMemberuserUserreportsController } from "./controllers/communityPlatform/memberUser/userReports/CommunityplatformMemberuserUserreportsController";
import { CommunityplatformAdminuserModerationcasesController } from "./controllers/communityPlatform/adminUser/moderationCases/CommunityplatformAdminuserModerationcasesController";
import { CommunityplatformAdminuserModerationcasesReportsController } from "./controllers/communityPlatform/adminUser/moderationCases/reports/CommunityplatformAdminuserModerationcasesReportsController";
import { CommunityplatformAdminuserModerationcasesModerationactionsController } from "./controllers/communityPlatform/adminUser/moderationCases/moderationActions/CommunityplatformAdminuserModerationcasesModerationactionsController";
import { CommunityplatformAdminuserModerationcasesAppealsController } from "./controllers/communityPlatform/adminUser/moderationCases/appeals/CommunityplatformAdminuserModerationcasesAppealsController";
import { CommunityplatformAdminuserModerationcasesStatisticsController } from "./controllers/communityPlatform/adminUser/moderationCases/statistics/CommunityplatformAdminuserModerationcasesStatisticsController";
import { CommunityplatformAdminuserModerationactionsController } from "./controllers/communityPlatform/adminUser/moderationActions/CommunityplatformAdminuserModerationactionsController";
import { CommunityplatformAdminuserModerationactionsContentController } from "./controllers/communityPlatform/adminUser/moderationActions/content/CommunityplatformAdminuserModerationactionsContentController";
import { CommunityplatformAdminuserModerationactionsCommunityController } from "./controllers/communityPlatform/adminUser/moderationActions/community/CommunityplatformAdminuserModerationactionsCommunityController";
import { CommunityplatformAdminuserModerationactionsUserController } from "./controllers/communityPlatform/adminUser/moderationActions/user/CommunityplatformAdminuserModerationactionsUserController";
import { CommunityplatformAdminuserModerationactionsAppealsController } from "./controllers/communityPlatform/adminUser/moderationActions/appeals/CommunityplatformAdminuserModerationactionsAppealsController";
import { CommunityplatformAdminuserModerationactionsMetricsController } from "./controllers/communityPlatform/adminUser/moderationActions/metrics/CommunityplatformAdminuserModerationactionsMetricsController";
import { CommunityplatformAdminuserAppealsController } from "./controllers/communityPlatform/adminUser/appeals/CommunityplatformAdminuserAppealsController";
import { CommunityplatformMemberuserAppealsController } from "./controllers/communityPlatform/memberUser/appeals/CommunityplatformMemberuserAppealsController";
import { CommunityplatformAdminuserReportsQueuesPostController } from "./controllers/communityPlatform/adminUser/reports/queues/post/CommunityplatformAdminuserReportsQueuesPostController";
import { CommunityplatformAdminuserReportsQueuesCommentController } from "./controllers/communityPlatform/adminUser/reports/queues/comment/CommunityplatformAdminuserReportsQueuesCommentController";
import { CommunityplatformAdminuserReportsQueuesCommunityController } from "./controllers/communityPlatform/adminUser/reports/queues/community/CommunityplatformAdminuserReportsQueuesCommunityController";
import { CommunityplatformAdminuserReportsQueuesUserController } from "./controllers/communityPlatform/adminUser/reports/queues/user/CommunityplatformAdminuserReportsQueuesUserController";
import { CommunityplatformAdminuserModerationDashboardOverviewController } from "./controllers/communityPlatform/adminUser/moderation/dashboard/overview/CommunityplatformAdminuserModerationDashboardOverviewController";
import { CommunityplatformAdminuserModerationAnalyticsWorkloadController } from "./controllers/communityPlatform/adminUser/moderation/analytics/workload/CommunityplatformAdminuserModerationAnalyticsWorkloadController";
import { CommunityplatformAdminuserModerationAnalyticsOutcomesController } from "./controllers/communityPlatform/adminUser/moderation/analytics/outcomes/CommunityplatformAdminuserModerationAnalyticsOutcomesController";
import { CommunityplatformAdminuserModerationSearchReportsController } from "./controllers/communityPlatform/adminUser/moderation/search/reports/CommunityplatformAdminuserModerationSearchReportsController";
import { CommunityplatformAdminuserModerationSearchCasesController } from "./controllers/communityPlatform/adminUser/moderation/search/cases/CommunityplatformAdminuserModerationSearchCasesController";
import { CommunityplatformAdminuserModerationSearchActionsController } from "./controllers/communityPlatform/adminUser/moderation/search/actions/CommunityplatformAdminuserModerationSearchActionsController";
import { CommunityplatformMemberuserNotificationsController } from "./controllers/communityPlatform/memberUser/notifications/CommunityplatformMemberuserNotificationsController";
import { CommunityplatformAdminuserNotificationsController } from "./controllers/communityPlatform/adminUser/notifications/CommunityplatformAdminuserNotificationsController";
import { CommunityplatformMemberuserNotificationsMarkreadController } from "./controllers/communityPlatform/memberUser/notifications/markRead/CommunityplatformMemberuserNotificationsMarkreadController";
import { CommunityplatformMemberuserNotificationsMarkunreadController } from "./controllers/communityPlatform/memberUser/notifications/markUnread/CommunityplatformMemberuserNotificationsMarkunreadController";
import { CommunityplatformSearchGlobalController } from "./controllers/communityPlatform/search/global/CommunityplatformSearchGlobalController";
import { CommunityplatformSearchDocumentsController } from "./controllers/communityPlatform/search/documents/CommunityplatformSearchDocumentsController";
import { CommunityplatformAdminuserSearchIndexdocumentsController } from "./controllers/communityPlatform/adminUser/search/indexDocuments/CommunityplatformAdminuserSearchIndexdocumentsController";
import { CommunityplatformDiscoveryItemsController } from "./controllers/communityPlatform/discovery/items/CommunityplatformDiscoveryItemsController";
import { CommunityplatformAdminuserDiscoveryItemsController } from "./controllers/communityPlatform/adminUser/discovery/items/CommunityplatformAdminuserDiscoveryItemsController";
import { CommunityplatformMemberuserDiscoveryFeedsHomeController } from "./controllers/communityPlatform/memberUser/discovery/feeds/home/CommunityplatformMemberuserDiscoveryFeedsHomeController";
import { CommunityplatformMemberuserDiscoveryFeedsCommunityController } from "./controllers/communityPlatform/memberUser/discovery/feeds/community/CommunityplatformMemberuserDiscoveryFeedsCommunityController";
import { CommunityplatformDiscoveryFeedsOnboardingController } from "./controllers/communityPlatform/discovery/feeds/onboarding/CommunityplatformDiscoveryFeedsOnboardingController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthAdminuserController,
    CommunityplatformAdminuserSystemconfigsController,
    CommunityplatformAdminuserRatelimitbucketsController,
    CommunityplatformAdminuserAuditlogsController,
    CommunityplatformAdminuserErrorlogsController,
    CommunityplatformAdminuserErrorlogsOverviewController,
    CommunityplatformAdminuserGuestusersController,
    CommunityplatformAdminuserMemberusersController,
    CommunityplatformMemberuserMemberusersController,
    CommunityplatformAdminuserMemberusersSessionsController,
    CommunityplatformAdminuserAdminusersController,
    CommunityplatformAdminuserAdminusersSessionsController,
    CommunityplatformAdminuserAccountrestrictionsController,
    CommunityplatformAdminuserMemberusersAccountrestrictionsController,
    CommunityplatformAdminuserAdminusersAccountrestrictionsController,
    CommunityplatformAdminuserPasswordresettokensController,
    CommunityplatformAdminuserLoginattemptsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberuserCommunitiesController,
    CommunityplatformAdminuserCommunitiesController,
    CommunityplatformMemberuserCommunitiesRulesController,
    CommunityplatformAdminuserCommunitiesRulesController,
    CommunityplatformAdminuserCommunitiesMembershipsController,
    CommunityplatformMemberuserCommunitiesMembershipsController,
    CommunityplatformAdminuserCommunitiesStatushistoriesController,
    CommunityplatformPostsController,
    CommunityplatformMemberuserPostsController,
    CommunityplatformAdminuserPostsController,
    CommunityplatformAdminuserPostsLockController,
    CommunityplatformMemberuserPostsCommentsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformAdminuserPostsCommentsController,
    CommunityplatformMemberuserPostsCommentsRepliesController,
    CommunityplatformPostsCommentsRepliesController,
    CommunityplatformAdminuserPostsCommentsRepliesController,
    CommunityplatformMemberuserPostsEdithistoriesController,
    CommunityplatformAdminuserPostsEdithistoriesController,
    CommunityplatformMemberuserCommentsEdithistoriesController,
    CommunityplatformCommentsEdithistoriesController,
    CommunityplatformMemberuserFeedsPostsController,
    CommunityplatformThreadsController,
    CommunityplatformSearchPostsController,
    CommunityplatformSearchCommentsController,
    CommunityplatformAdminuserAnalyticsPostsController,
    CommunityplatformAdminuserAnalyticsCommentsController,
    CommunityplatformMemberuserPostsVotesController,
    CommunityplatformCommentsVotesController,
    CommunityplatformMemberuserCommentsVotesController,
    CommunityplatformAdminuserUserkarmasController,
    CommunityplatformUserkarmasBymemberuserController,
    CommunityplatformAdminuserKarmaeventsController,
    CommunityplatformAdminuserStatisticsKarmaSummaryController,
    CommunityplatformAdminuserStatisticsKarmaByuserController,
    CommunityplatformAdminuserStatisticsKarmaBycontentController,
    CommunityplatformAdminuserAnalyticsVotesTrendsController,
    CommunityplatformAdminuserAnalyticsVotesAbusesignalsController,
    CommunityplatformMemberuserAnalyticsKarmaEvolutionController,
    CommunityplatformMemberuserSubscriptionsController,
    CommunityplatformMemberuserMembersSubscriptionsController,
    CommunityplatformCommunitiesSubscribersController,
    CommunityplatformAdminuserCommunitiesSubscribersController,
    CommunityplatformProfilesController,
    CommunityplatformMemberuserProfilesController,
    CommunityplatformProfilesPublicviewController,
    CommunityplatformProfilesAchievementsController,
    CommunityplatformAdminuserProfilesAchievementsController,
    CommunityplatformMemberuserProfilesSettingsController,
    CommunityplatformAdminuserPostreportsController,
    CommunityplatformMemberuserPostreportsController,
    CommunityplatformAdminuserCommentreportsController,
    CommunityplatformMemberuserCommentreportsController,
    CommunityplatformAdminuserCommunityreportsController,
    CommunityplatformMemberuserCommunityreportsController,
    CommunityplatformAdminuserUserreportsController,
    CommunityplatformMemberuserUserreportsController,
    CommunityplatformAdminuserModerationcasesController,
    CommunityplatformAdminuserModerationcasesReportsController,
    CommunityplatformAdminuserModerationcasesModerationactionsController,
    CommunityplatformAdminuserModerationcasesAppealsController,
    CommunityplatformAdminuserModerationcasesStatisticsController,
    CommunityplatformAdminuserModerationactionsController,
    CommunityplatformAdminuserModerationactionsContentController,
    CommunityplatformAdminuserModerationactionsCommunityController,
    CommunityplatformAdminuserModerationactionsUserController,
    CommunityplatformAdminuserModerationactionsAppealsController,
    CommunityplatformAdminuserModerationactionsMetricsController,
    CommunityplatformAdminuserAppealsController,
    CommunityplatformMemberuserAppealsController,
    CommunityplatformAdminuserReportsQueuesPostController,
    CommunityplatformAdminuserReportsQueuesCommentController,
    CommunityplatformAdminuserReportsQueuesCommunityController,
    CommunityplatformAdminuserReportsQueuesUserController,
    CommunityplatformAdminuserModerationDashboardOverviewController,
    CommunityplatformAdminuserModerationAnalyticsWorkloadController,
    CommunityplatformAdminuserModerationAnalyticsOutcomesController,
    CommunityplatformAdminuserModerationSearchReportsController,
    CommunityplatformAdminuserModerationSearchCasesController,
    CommunityplatformAdminuserModerationSearchActionsController,
    CommunityplatformMemberuserNotificationsController,
    CommunityplatformAdminuserNotificationsController,
    CommunityplatformMemberuserNotificationsMarkreadController,
    CommunityplatformMemberuserNotificationsMarkunreadController,
    CommunityplatformSearchGlobalController,
    CommunityplatformSearchDocumentsController,
    CommunityplatformAdminuserSearchIndexdocumentsController,
    CommunityplatformDiscoveryItemsController,
    CommunityplatformAdminuserDiscoveryItemsController,
    CommunityplatformMemberuserDiscoveryFeedsHomeController,
    CommunityplatformMemberuserDiscoveryFeedsCommunityController,
    CommunityplatformDiscoveryFeedsOnboardingController,
  ],
})
export class MyModule {}
