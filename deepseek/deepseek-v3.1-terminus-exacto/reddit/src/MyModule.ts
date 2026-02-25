import { Module } from "@nestjs/common";

import { CommunityplatformAdminController } from "./controllers/communityPlatform/admin/CommunityplatformAdminController";
import { CommunityplatformAdminAccountController } from "./controllers/communityPlatform/admin/account/CommunityplatformAdminAccountController";
import { CommunityplatformAdminAnalyticsController } from "./controllers/communityPlatform/admin/analytics/CommunityplatformAdminAnalyticsController";
import { CommunityplatformAdminAnalyticsAuditController } from "./controllers/communityPlatform/admin/analytics/audit/CommunityplatformAdminAnalyticsAuditController";
import { CommunityplatformAdminAnalyticsConfigurationsController } from "./controllers/communityPlatform/admin/analytics/configurations/CommunityplatformAdminAnalyticsConfigurationsController";
import { CommunityplatformAdminAnalyticsFeature_flagsController } from "./controllers/communityPlatform/admin/analytics/feature-flags/CommunityplatformAdminAnalyticsFeature_flagsController";
import { CommunityplatformAdminAnalyticsHealthController } from "./controllers/communityPlatform/admin/analytics/health/CommunityplatformAdminAnalyticsHealthController";
import { CommunityplatformAdminAnalyticsPerformanceController } from "./controllers/communityPlatform/admin/analytics/performance/CommunityplatformAdminAnalyticsPerformanceController";
import { CommunityplatformAdminAnalyticsUsersController } from "./controllers/communityPlatform/admin/analytics/users/CommunityplatformAdminAnalyticsUsersController";
import { CommunityplatformAdminAnalyticsVoting_metricsController } from "./controllers/communityPlatform/admin/analytics/voting-metrics/CommunityplatformAdminAnalyticsVoting_metricsController";
import { CommunityplatformAdminAnalyticsVoting_patternsController } from "./controllers/communityPlatform/admin/analytics/voting-patterns/CommunityplatformAdminAnalyticsVoting_patternsController";
import { CommunityplatformAdminAnalyticsVoting_performanceController } from "./controllers/communityPlatform/admin/analytics/voting-performance/CommunityplatformAdminAnalyticsVoting_performanceController";
import { CommunityplatformAdminApi_rate_limitsController } from "./controllers/communityPlatform/admin/api-rate-limits/CommunityplatformAdminApi_rate_limitsController";
import { CommunityplatformAdminAudit_logsController } from "./controllers/communityPlatform/admin/audit-logs/CommunityplatformAdminAudit_logsController";
import { CommunityplatformAdminAudit_reportsController } from "./controllers/communityPlatform/admin/audit-reports/CommunityplatformAdminAudit_reportsController";
import { CommunityplatformAdminAuth_tokensController } from "./controllers/communityPlatform/admin/auth-tokens/CommunityplatformAdminAuth_tokensController";
import { CommunityplatformAdminBulkModerationsController } from "./controllers/communityPlatform/admin/bulk/moderations/CommunityplatformAdminBulkModerationsController";
import { CommunityplatformAdminCommentsVote_scoreController } from "./controllers/communityPlatform/admin/comments/vote-score/CommunityplatformAdminCommentsVote_scoreController";
import { CommunityplatformAdminCommentsVote_scoresController } from "./controllers/communityPlatform/admin/comments/vote-scores/CommunityplatformAdminCommentsVote_scoresController";
import { CommunityplatformAdminCommentsVotesController } from "./controllers/communityPlatform/admin/comments/votes/CommunityplatformAdminCommentsVotesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformAdminCommunitiesAnnouncementsController } from "./controllers/communityPlatform/admin/communities/announcements/CommunityplatformAdminCommunitiesAnnouncementsController";
import { CommunityplatformAdminCommunitiesBansController } from "./controllers/communityPlatform/admin/communities/bans/CommunityplatformAdminCommunitiesBansController";
import { CommunityplatformAdminCommunitiesFlair_assignmentsController } from "./controllers/communityPlatform/admin/communities/flair-assignments/CommunityplatformAdminCommunitiesFlair_assignmentsController";
import { CommunityplatformAdminCommunitiesFlairsController } from "./controllers/communityPlatform/admin/communities/flairs/CommunityplatformAdminCommunitiesFlairsController";
import { CommunityplatformAdminCommunitiesInvitationsController } from "./controllers/communityPlatform/admin/communities/invitations/CommunityplatformAdminCommunitiesInvitationsController";
import { CommunityplatformAdminCommunitiesModeratorsController } from "./controllers/communityPlatform/admin/communities/moderators/CommunityplatformAdminCommunitiesModeratorsController";
import { CommunityplatformAdminCommunitiesModeratorsPrivilegesController } from "./controllers/communityPlatform/admin/communities/moderators/privileges/CommunityplatformAdminCommunitiesModeratorsPrivilegesController";
import { CommunityplatformAdminCommunitiesRulesController } from "./controllers/communityPlatform/admin/communities/rules/CommunityplatformAdminCommunitiesRulesController";
import { CommunityplatformAdminCommunitiesSnapshotsController } from "./controllers/communityPlatform/admin/communities/snapshots/CommunityplatformAdminCommunitiesSnapshotsController";
import { CommunityplatformAdminCommunitiesWikisController } from "./controllers/communityPlatform/admin/communities/wikis/CommunityplatformAdminCommunitiesWikisController";
import { CommunityplatformAdminConfigurationsController } from "./controllers/communityPlatform/admin/configurations/CommunityplatformAdminConfigurationsController";
import { CommunityplatformAdminConfigurationsBatchController } from "./controllers/communityPlatform/admin/configurations/batch/CommunityplatformAdminConfigurationsBatchController";
import { CommunityplatformAdminDashboardController } from "./controllers/communityPlatform/admin/dashboard/CommunityplatformAdminDashboardController";
import { CommunityplatformAdminError_logsController } from "./controllers/communityPlatform/admin/error-logs/CommunityplatformAdminError_logsController";
import { CommunityplatformAdminFeature_flagsController } from "./controllers/communityPlatform/admin/feature-flags/CommunityplatformAdminFeature_flagsController";
import { CommunityplatformAdminFeature_flagsEnvironmentsController } from "./controllers/communityPlatform/admin/feature-flags/environments/CommunityplatformAdminFeature_flagsEnvironmentsController";
import { CommunityplatformAdminFeature_flagsEnvironmentsDetailsController } from "./controllers/communityPlatform/admin/feature-flags/environments/details/CommunityplatformAdminFeature_flagsEnvironmentsDetailsController";
import { CommunityplatformAdminFeature_flagsEnvironmentsDetailsConfiguration_overridesController } from "./controllers/communityPlatform/admin/feature-flags/environments/details/configuration-overrides/CommunityplatformAdminFeature_flagsEnvironmentsDetailsConfiguration_overridesController";
import { CommunityplatformAdminFeature_flagsEnvironmentsDetailsTargeting_rulesController } from "./controllers/communityPlatform/admin/feature-flags/environments/details/targeting-rules/CommunityplatformAdminFeature_flagsEnvironmentsDetailsTargeting_rulesController";
import { CommunityplatformAdminFeature_flagsEnvironmentsTargeting_rulesController } from "./controllers/communityPlatform/admin/feature-flags/environments/targeting-rules/CommunityplatformAdminFeature_flagsEnvironmentsTargeting_rulesController";
import { CommunityplatformAdminFeature_flagsTargeting_rulesController } from "./controllers/communityPlatform/admin/feature-flags/targeting-rules/CommunityplatformAdminFeature_flagsTargeting_rulesController";
import { CommunityplatformAdminHistoriesController } from "./controllers/communityPlatform/admin/histories/CommunityplatformAdminHistoriesController";
import { CommunityplatformAdminMaintenance_windowsController } from "./controllers/communityPlatform/admin/maintenance-windows/CommunityplatformAdminMaintenance_windowsController";
import { CommunityplatformAdminModeration_action_logsController } from "./controllers/communityPlatform/admin/moderation-action-logs/CommunityplatformAdminModeration_action_logsController";
import { CommunityplatformAdminModeration_audit_logsController } from "./controllers/communityPlatform/admin/moderation-audit-logs/CommunityplatformAdminModeration_audit_logsController";
import { CommunityplatformAdminModeration_queuesController } from "./controllers/communityPlatform/admin/moderation-queues/CommunityplatformAdminModeration_queuesController";
import { CommunityplatformAdminPasswordController } from "./controllers/communityPlatform/admin/password/CommunityplatformAdminPasswordController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformAdminPostsCommentsHierarchyController } from "./controllers/communityPlatform/admin/posts/comments/hierarchy/CommunityplatformAdminPostsCommentsHierarchyController";
import { CommunityplatformAdminPostsCommentsModerationsController } from "./controllers/communityPlatform/admin/posts/comments/moderations/CommunityplatformAdminPostsCommentsModerationsController";
import { CommunityplatformAdminPostsCommentsSortedController } from "./controllers/communityPlatform/admin/posts/comments/sorted/CommunityplatformAdminPostsCommentsSortedController";
import { CommunityplatformAdminPostsSnapshotsController } from "./controllers/communityPlatform/admin/posts/snapshots/CommunityplatformAdminPostsSnapshotsController";
import { CommunityplatformAdminPostsVote_scoreController } from "./controllers/communityPlatform/admin/posts/vote-score/CommunityplatformAdminPostsVote_scoreController";
import { CommunityplatformAdminPostsVote_scoresController } from "./controllers/communityPlatform/admin/posts/vote-scores/CommunityplatformAdminPostsVote_scoresController";
import { CommunityplatformAdminPostsVotesController } from "./controllers/communityPlatform/admin/posts/votes/CommunityplatformAdminPostsVotesController";
import { CommunityplatformAdminReport_categoriesController } from "./controllers/communityPlatform/admin/report-categories/CommunityplatformAdminReport_categoriesController";
import { CommunityplatformAdminSystem_alertsController } from "./controllers/communityPlatform/admin/system-alerts/CommunityplatformAdminSystem_alertsController";
import { CommunityplatformAdminSystem_notificationsController } from "./controllers/communityPlatform/admin/system-notifications/CommunityplatformAdminSystem_notificationsController";
import { CommunityplatformAdminSystem_notificationsBroadcast_deliveriesController } from "./controllers/communityPlatform/admin/system-notifications/broadcast-deliveries/CommunityplatformAdminSystem_notificationsBroadcast_deliveriesController";
import { CommunityplatformAdminSystem_snapshotsController } from "./controllers/communityPlatform/admin/system-snapshots/CommunityplatformAdminSystem_snapshotsController";
import { CommunityplatformAdminUser_activitiesController } from "./controllers/communityPlatform/admin/user-activities/CommunityplatformAdminUser_activitiesController";
import { CommunityplatformAdminVote_karma_impactsController } from "./controllers/communityPlatform/admin/vote-karma-impacts/CommunityplatformAdminVote_karma_impactsController";
import { CommunityplatformAdminVote_rate_limitsController } from "./controllers/communityPlatform/admin/vote-rate-limits/CommunityplatformAdminVote_rate_limitsController";
import { CommunityplatformAdminVoting_transactionsController } from "./controllers/communityPlatform/admin/voting-transactions/CommunityplatformAdminVoting_transactionsController";
import { CommunityplatformAdminsController } from "./controllers/communityPlatform/admins/CommunityplatformAdminsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthModeratorController } from "./controllers/communityPlatform/auth/moderator/CommunityplatformAuthModeratorController";
import { CommunityplatformAuthUserController } from "./controllers/communityPlatform/auth/user/CommunityplatformAuthUserController";
import { CommunityplatformCategoriesController } from "./controllers/communityPlatform/categories/CommunityplatformCategoriesController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesAnnouncementsController } from "./controllers/communityPlatform/communities/announcements/CommunityplatformCommunitiesAnnouncementsController";
import { CommunityplatformCommunitiesBrowseController } from "./controllers/communityPlatform/communities/browse/CommunityplatformCommunitiesBrowseController";
import { CommunityplatformCommunitiesFlairsController } from "./controllers/communityPlatform/communities/flairs/CommunityplatformCommunitiesFlairsController";
import { CommunityplatformCommunitiesModeratorsController } from "./controllers/communityPlatform/communities/moderators/CommunityplatformCommunitiesModeratorsController";
import { CommunityplatformCommunitiesPopularController } from "./controllers/communityPlatform/communities/popular/CommunityplatformCommunitiesPopularController";
import { CommunityplatformCommunitiesRulesController } from "./controllers/communityPlatform/communities/rules/CommunityplatformCommunitiesRulesController";
import { CommunityplatformCommunitiesStatisticsController } from "./controllers/communityPlatform/communities/statistics/CommunityplatformCommunitiesStatisticsController";
import { CommunityplatformCommunitiesWikisController } from "./controllers/communityPlatform/communities/wikis/CommunityplatformCommunitiesWikisController";
import { CommunityplatformModeratorController } from "./controllers/communityPlatform/moderator/CommunityplatformModeratorController";
import { CommunityplatformModeratorAccountController } from "./controllers/communityPlatform/moderator/account/CommunityplatformModeratorAccountController";
import { CommunityplatformModeratorAnalyticsController } from "./controllers/communityPlatform/moderator/analytics/CommunityplatformModeratorAnalyticsController";
import { CommunityplatformModeratorBulkModerationsController } from "./controllers/communityPlatform/moderator/bulk/moderations/CommunityplatformModeratorBulkModerationsController";
import { CommunityplatformModeratorCommentsVote_scoreController } from "./controllers/communityPlatform/moderator/comments/vote-score/CommunityplatformModeratorCommentsVote_scoreController";
import { CommunityplatformModeratorCommentsVote_scoresController } from "./controllers/communityPlatform/moderator/comments/vote-scores/CommunityplatformModeratorCommentsVote_scoresController";
import { CommunityplatformModeratorCommentsVotesController } from "./controllers/communityPlatform/moderator/comments/votes/CommunityplatformModeratorCommentsVotesController";
import { CommunityplatformModeratorCommunitiesAnnouncementsController } from "./controllers/communityPlatform/moderator/communities/announcements/CommunityplatformModeratorCommunitiesAnnouncementsController";
import { CommunityplatformModeratorCommunitiesBansController } from "./controllers/communityPlatform/moderator/communities/bans/CommunityplatformModeratorCommunitiesBansController";
import { CommunityplatformModeratorCommunitiesFlair_assignmentsController } from "./controllers/communityPlatform/moderator/communities/flair-assignments/CommunityplatformModeratorCommunitiesFlair_assignmentsController";
import { CommunityplatformModeratorCommunitiesFlairsController } from "./controllers/communityPlatform/moderator/communities/flairs/CommunityplatformModeratorCommunitiesFlairsController";
import { CommunityplatformModeratorCommunitiesInvitationsController } from "./controllers/communityPlatform/moderator/communities/invitations/CommunityplatformModeratorCommunitiesInvitationsController";
import { CommunityplatformModeratorCommunitiesRulesController } from "./controllers/communityPlatform/moderator/communities/rules/CommunityplatformModeratorCommunitiesRulesController";
import { CommunityplatformModeratorCommunitiesSnapshotsController } from "./controllers/communityPlatform/moderator/communities/snapshots/CommunityplatformModeratorCommunitiesSnapshotsController";
import { CommunityplatformModeratorCommunitiesWikisController } from "./controllers/communityPlatform/moderator/communities/wikis/CommunityplatformModeratorCommunitiesWikisController";
import { CommunityplatformModeratorDashboardsController } from "./controllers/communityPlatform/moderator/dashboards/CommunityplatformModeratorDashboardsController";
import { CommunityplatformModeratorHistoriesController } from "./controllers/communityPlatform/moderator/histories/CommunityplatformModeratorHistoriesController";
import { CommunityplatformModeratorModeration_queuesController } from "./controllers/communityPlatform/moderator/moderation-queues/CommunityplatformModeratorModeration_queuesController";
import { CommunityplatformModeratorPasswordController } from "./controllers/communityPlatform/moderator/password/CommunityplatformModeratorPasswordController";
import { CommunityplatformModeratorPostsController } from "./controllers/communityPlatform/moderator/posts/CommunityplatformModeratorPostsController";
import { CommunityplatformModeratorPostsCommentsHierarchyController } from "./controllers/communityPlatform/moderator/posts/comments/hierarchy/CommunityplatformModeratorPostsCommentsHierarchyController";
import { CommunityplatformModeratorPostsCommentsModerationsController } from "./controllers/communityPlatform/moderator/posts/comments/moderations/CommunityplatformModeratorPostsCommentsModerationsController";
import { CommunityplatformModeratorPostsCommentsSortedController } from "./controllers/communityPlatform/moderator/posts/comments/sorted/CommunityplatformModeratorPostsCommentsSortedController";
import { CommunityplatformModeratorPostsSnapshotsController } from "./controllers/communityPlatform/moderator/posts/snapshots/CommunityplatformModeratorPostsSnapshotsController";
import { CommunityplatformModeratorPostsVote_scoreController } from "./controllers/communityPlatform/moderator/posts/vote-score/CommunityplatformModeratorPostsVote_scoreController";
import { CommunityplatformModeratorPostsVote_scoresController } from "./controllers/communityPlatform/moderator/posts/vote-scores/CommunityplatformModeratorPostsVote_scoresController";
import { CommunityplatformModeratorPostsVotesController } from "./controllers/communityPlatform/moderator/posts/votes/CommunityplatformModeratorPostsVotesController";
import { CommunityplatformModeratorVote_karma_impactsController } from "./controllers/communityPlatform/moderator/vote-karma-impacts/CommunityplatformModeratorVote_karma_impactsController";
import { CommunityplatformModeratorVote_rate_limitsController } from "./controllers/communityPlatform/moderator/vote-rate-limits/CommunityplatformModeratorVote_rate_limitsController";
import { CommunityplatformModeratorVoting_transactionsController } from "./controllers/communityPlatform/moderator/voting-transactions/CommunityplatformModeratorVoting_transactionsController";
import { CommunityplatformModeratorsController } from "./controllers/communityPlatform/moderators/CommunityplatformModeratorsController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsCommentsRepliesController } from "./controllers/communityPlatform/posts/comments/replies/CommunityplatformPostsCommentsRepliesController";
import { CommunityplatformPostsCommentsScoresController } from "./controllers/communityPlatform/posts/comments/scores/CommunityplatformPostsCommentsScoresController";
import { CommunityplatformPostsViewController } from "./controllers/communityPlatform/posts/view/CommunityplatformPostsViewController";
import { CommunityplatformUserController } from "./controllers/communityPlatform/user/CommunityplatformUserController";
import { CommunityplatformUserAccountController } from "./controllers/communityPlatform/user/account/CommunityplatformUserAccountController";
import { CommunityplatformUserCommentsVote_scoreController } from "./controllers/communityPlatform/user/comments/vote-score/CommunityplatformUserCommentsVote_scoreController";
import { CommunityplatformUserCommentsVote_scoresController } from "./controllers/communityPlatform/user/comments/vote-scores/CommunityplatformUserCommentsVote_scoresController";
import { CommunityplatformUserCommentsVotesController } from "./controllers/communityPlatform/user/comments/votes/CommunityplatformUserCommentsVotesController";
import { CommunityplatformUserCommunitiesController } from "./controllers/communityPlatform/user/communities/CommunityplatformUserCommunitiesController";
import { CommunityplatformUserCommunitiesModeratorsController } from "./controllers/communityPlatform/user/communities/moderators/CommunityplatformUserCommunitiesModeratorsController";
import { CommunityplatformUserEmail_verificationsController } from "./controllers/communityPlatform/user/email-verifications/CommunityplatformUserEmail_verificationsController";
import { CommunityplatformUserInvitationsController } from "./controllers/communityPlatform/user/invitations/CommunityplatformUserInvitationsController";
import { CommunityplatformUserPassword_resetsController } from "./controllers/communityPlatform/user/password-resets/CommunityplatformUserPassword_resetsController";
import { CommunityplatformUserPasswordController } from "./controllers/communityPlatform/user/password/CommunityplatformUserPasswordController";
import { CommunityplatformUserPostsController } from "./controllers/communityPlatform/user/posts/CommunityplatformUserPostsController";
import { CommunityplatformUserPostsCommentsController } from "./controllers/communityPlatform/user/posts/comments/CommunityplatformUserPostsCommentsController";
import { CommunityplatformUserPostsCommentsHierarchyController } from "./controllers/communityPlatform/user/posts/comments/hierarchy/CommunityplatformUserPostsCommentsHierarchyController";
import { CommunityplatformUserPostsCommentsRepliesController } from "./controllers/communityPlatform/user/posts/comments/replies/CommunityplatformUserPostsCommentsRepliesController";
import { CommunityplatformUserPostsCommentsSortedController } from "./controllers/communityPlatform/user/posts/comments/sorted/CommunityplatformUserPostsCommentsSortedController";
import { CommunityplatformUserPostsFavoriteController } from "./controllers/communityPlatform/user/posts/favorite/CommunityplatformUserPostsFavoriteController";
import { CommunityplatformUserPostsFavoritesController } from "./controllers/communityPlatform/user/posts/favorites/CommunityplatformUserPostsFavoritesController";
import { CommunityplatformUserPostsVote_scoreController } from "./controllers/communityPlatform/user/posts/vote-score/CommunityplatformUserPostsVote_scoreController";
import { CommunityplatformUserPostsVote_scoresController } from "./controllers/communityPlatform/user/posts/vote-scores/CommunityplatformUserPostsVote_scoresController";
import { CommunityplatformUserPostsVotesController } from "./controllers/communityPlatform/user/posts/votes/CommunityplatformUserPostsVotesController";
import { CommunityplatformUserProfileController } from "./controllers/communityPlatform/user/profile/CommunityplatformUserProfileController";
import { CommunityplatformUserSessionsController } from "./controllers/communityPlatform/user/sessions/CommunityplatformUserSessionsController";
import { CommunityplatformUserSubscriptionsController } from "./controllers/communityPlatform/user/subscriptions/CommunityplatformUserSubscriptionsController";
import { CommunityplatformUserVote_karma_impactsController } from "./controllers/communityPlatform/user/vote-karma-impacts/CommunityplatformUserVote_karma_impactsController";
import { CommunityplatformUserVote_rate_limitsController } from "./controllers/communityPlatform/user/vote-rate-limits/CommunityplatformUserVote_rate_limitsController";
import { CommunityplatformUserVoting_transactionsController } from "./controllers/communityPlatform/user/voting-transactions/CommunityplatformUserVoting_transactionsController";
import { CommunityplatformUsersController } from "./controllers/communityPlatform/users/CommunityplatformUsersController";

@Module({
  controllers: [
    CommunityplatformAuthUserController,
    CommunityplatformAuthModeratorController,
    CommunityplatformAuthAdminController,
    CommunityplatformUsersController,
    CommunityplatformUserProfileController,
    CommunityplatformUserSessionsController,
    CommunityplatformUserPassword_resetsController,
    CommunityplatformUserEmail_verificationsController,
    CommunityplatformModeratorsController,
    CommunityplatformAdminsController,
    CommunityplatformAdminConfigurationsController,
    CommunityplatformAdminAudit_logsController,
    CommunityplatformAdminReport_categoriesController,
    CommunityplatformAdminSystem_snapshotsController,
    CommunityplatformAdminFeature_flagsController,
    CommunityplatformAdminApi_rate_limitsController,
    CommunityplatformAdminSystem_alertsController,
    CommunityplatformAdminMaintenance_windowsController,
    CommunityplatformAdminError_logsController,
    CommunityplatformAdminAuth_tokensController,
    CommunityplatformAdminUser_activitiesController,
    CommunityplatformAdminSystem_notificationsController,
    CommunityplatformAdminModeration_queuesController,
    CommunityplatformModeratorModeration_queuesController,
    CommunityplatformAdminFeature_flagsTargeting_rulesController,
    CommunityplatformAdminFeature_flagsEnvironmentsController,
    CommunityplatformAdminFeature_flagsEnvironmentsDetailsController,
    CommunityplatformAdminFeature_flagsEnvironmentsTargeting_rulesController,
    CommunityplatformAdminFeature_flagsEnvironmentsDetailsTargeting_rulesController,
    CommunityplatformAdminFeature_flagsEnvironmentsDetailsConfiguration_overridesController,
    CommunityplatformAdminSystem_notificationsBroadcast_deliveriesController,
    CommunityplatformCategoriesController,
    CommunityplatformUserCommunitiesController,
    CommunityplatformCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformUserSubscriptionsController,
    CommunityplatformCommunitiesModeratorsController,
    CommunityplatformUserCommunitiesModeratorsController,
    CommunityplatformAdminCommunitiesModeratorsController,
    CommunityplatformCommunitiesRulesController,
    CommunityplatformModeratorCommunitiesRulesController,
    CommunityplatformAdminCommunitiesRulesController,
    CommunityplatformCommunitiesAnnouncementsController,
    CommunityplatformModeratorCommunitiesAnnouncementsController,
    CommunityplatformAdminCommunitiesAnnouncementsController,
    CommunityplatformCommunitiesFlairsController,
    CommunityplatformModeratorCommunitiesFlairsController,
    CommunityplatformAdminCommunitiesFlairsController,
    CommunityplatformCommunitiesWikisController,
    CommunityplatformModeratorCommunitiesWikisController,
    CommunityplatformAdminCommunitiesWikisController,
    CommunityplatformModeratorCommunitiesFlair_assignmentsController,
    CommunityplatformAdminCommunitiesFlair_assignmentsController,
    CommunityplatformCommunitiesStatisticsController,
    CommunityplatformModeratorCommunitiesInvitationsController,
    CommunityplatformAdminCommunitiesInvitationsController,
    CommunityplatformUserInvitationsController,
    CommunityplatformModeratorCommunitiesSnapshotsController,
    CommunityplatformAdminCommunitiesSnapshotsController,
    CommunityplatformPostsController,
    CommunityplatformUserPostsController,
    CommunityplatformModeratorPostsController,
    CommunityplatformUserPostsFavoritesController,
    CommunityplatformUserPostsFavoriteController,
    CommunityplatformModeratorPostsSnapshotsController,
    CommunityplatformAdminPostsSnapshotsController,
    CommunityplatformUserPostsVotesController,
    CommunityplatformPostsViewController,
    CommunityplatformPostsCommentsController,
    CommunityplatformUserPostsCommentsController,
    CommunityplatformPostsCommentsRepliesController,
    CommunityplatformUserPostsCommentsRepliesController,
    CommunityplatformPostsCommentsScoresController,
    CommunityplatformModeratorPostsCommentsModerationsController,
    CommunityplatformAdminPostsCommentsModerationsController,
    CommunityplatformModeratorPostsVotesController,
    CommunityplatformAdminPostsVotesController,
    CommunityplatformUserCommentsVotesController,
    CommunityplatformModeratorCommentsVotesController,
    CommunityplatformAdminCommentsVotesController,
    CommunityplatformUserPostsVote_scoresController,
    CommunityplatformModeratorPostsVote_scoresController,
    CommunityplatformAdminPostsVote_scoresController,
    CommunityplatformUserPostsVote_scoreController,
    CommunityplatformModeratorPostsVote_scoreController,
    CommunityplatformAdminPostsVote_scoreController,
    CommunityplatformUserCommentsVote_scoresController,
    CommunityplatformModeratorCommentsVote_scoresController,
    CommunityplatformAdminCommentsVote_scoresController,
    CommunityplatformUserCommentsVote_scoreController,
    CommunityplatformModeratorCommentsVote_scoreController,
    CommunityplatformAdminCommentsVote_scoreController,
    CommunityplatformUserVote_karma_impactsController,
    CommunityplatformModeratorVote_karma_impactsController,
    CommunityplatformAdminVote_karma_impactsController,
    CommunityplatformUserVote_rate_limitsController,
    CommunityplatformModeratorVote_rate_limitsController,
    CommunityplatformAdminVote_rate_limitsController,
    CommunityplatformUserVoting_transactionsController,
    CommunityplatformModeratorVoting_transactionsController,
    CommunityplatformAdminVoting_transactionsController,
    CommunityplatformModeratorCommunitiesBansController,
    CommunityplatformAdminCommunitiesBansController,
    CommunityplatformAdminModeration_audit_logsController,
    CommunityplatformAdminModeration_action_logsController,
    CommunityplatformAdminCommunitiesModeratorsPrivilegesController,
    CommunityplatformUserController,
    CommunityplatformModeratorController,
    CommunityplatformAdminController,
    CommunityplatformUserPasswordController,
    CommunityplatformModeratorPasswordController,
    CommunityplatformAdminPasswordController,
    CommunityplatformUserAccountController,
    CommunityplatformModeratorAccountController,
    CommunityplatformAdminAccountController,
    CommunityplatformAdminAnalyticsFeature_flagsController,
    CommunityplatformAdminAnalyticsAuditController,
    CommunityplatformAdminAnalyticsPerformanceController,
    CommunityplatformAdminAnalyticsConfigurationsController,
    CommunityplatformAdminAnalyticsHealthController,
    CommunityplatformAdminAnalyticsUsersController,
    CommunityplatformAdminDashboardController,
    CommunityplatformAdminConfigurationsBatchController,
    CommunityplatformCommunitiesBrowseController,
    CommunityplatformCommunitiesPopularController,
    CommunityplatformAdminPostsController,
    CommunityplatformUserPostsCommentsHierarchyController,
    CommunityplatformModeratorPostsCommentsHierarchyController,
    CommunityplatformAdminPostsCommentsHierarchyController,
    CommunityplatformUserPostsCommentsSortedController,
    CommunityplatformModeratorPostsCommentsSortedController,
    CommunityplatformAdminPostsCommentsSortedController,
    CommunityplatformAdminAnalyticsVoting_patternsController,
    CommunityplatformAdminAnalyticsVoting_performanceController,
    CommunityplatformAdminAnalyticsVoting_metricsController,
    CommunityplatformModeratorDashboardsController,
    CommunityplatformModeratorAnalyticsController,
    CommunityplatformAdminAnalyticsController,
    CommunityplatformModeratorBulkModerationsController,
    CommunityplatformAdminBulkModerationsController,
    CommunityplatformModeratorHistoriesController,
    CommunityplatformAdminHistoriesController,
    CommunityplatformAdminAudit_reportsController,
  ],
})
export class MyModule {}
