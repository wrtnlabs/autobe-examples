import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdministrator_promotion_approvalsController } from "./controllers/discussionBoard/admin/administrator-promotion-approvals/DiscussionboardAdminAdministrator_promotion_approvalsController";
import { DiscussionboardAdminAdminsEmail_verificationsController } from "./controllers/discussionBoard/admin/admins/email-verifications/DiscussionboardAdminAdminsEmail_verificationsController";
import { DiscussionboardAdminAdminsPassword_resetsController } from "./controllers/discussionBoard/admin/admins/password-resets/DiscussionboardAdminAdminsPassword_resetsController";
import { DiscussionboardAdminAdminsProfileController } from "./controllers/discussionBoard/admin/admins/profile/DiscussionboardAdminAdminsProfileController";
import { DiscussionboardAdminAdminsSessionsController } from "./controllers/discussionBoard/admin/admins/sessions/DiscussionboardAdminAdminsSessionsController";
import { DiscussionboardAdminAnalyticsController } from "./controllers/discussionBoard/admin/analytics/DiscussionboardAdminAnalyticsController";
import { DiscussionboardAdminAnalyticsArticle_viewsController } from "./controllers/discussionBoard/admin/analytics/article-views/DiscussionboardAdminAnalyticsArticle_viewsController";
import { DiscussionboardAdminAnalyticsSectionsController } from "./controllers/discussionBoard/admin/analytics/sections/DiscussionboardAdminAnalyticsSectionsController";
import { DiscussionboardAdminAnalyticsUser_activityController } from "./controllers/discussionBoard/admin/analytics/user-activity/DiscussionboardAdminAnalyticsUser_activityController";
import { DiscussionboardAdminApi_rate_limitsController } from "./controllers/discussionBoard/admin/api-rate-limits/DiscussionboardAdminApi_rate_limitsController";
import { DiscussionboardAdminAppealsController } from "./controllers/discussionBoard/admin/appeals/DiscussionboardAdminAppealsController";
import { DiscussionboardAdminArticle_draftsController } from "./controllers/discussionBoard/admin/article-drafts/DiscussionboardAdminArticle_draftsController";
import { DiscussionboardAdminArticles_draftsController } from "./controllers/discussionBoard/admin/articles-drafts/DiscussionboardAdminArticles_draftsController";
import { DiscussionboardAdminArticles_draftsOwnController } from "./controllers/discussionBoard/admin/articles-drafts/own/DiscussionboardAdminArticles_draftsOwnController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesComment_pagination_settingsController } from "./controllers/discussionBoard/admin/articles/comment-pagination-settings/DiscussionboardAdminArticlesComment_pagination_settingsController";
import { DiscussionboardAdminArticlesFavoritesController } from "./controllers/discussionBoard/admin/articles/favorites/DiscussionboardAdminArticlesFavoritesController";
import { DiscussionboardAdminArticlesFilesController } from "./controllers/discussionBoard/admin/articles/files/DiscussionboardAdminArticlesFilesController";
import { DiscussionboardAdminArticlesImagesController } from "./controllers/discussionBoard/admin/articles/images/DiscussionboardAdminArticlesImagesController";
import { DiscussionboardAdminArticlesSnapshotsController } from "./controllers/discussionBoard/admin/articles/snapshots/DiscussionboardAdminArticlesSnapshotsController";
import { DiscussionboardAdminArticlesTagsController } from "./controllers/discussionBoard/admin/articles/tags/DiscussionboardAdminArticlesTagsController";
import { DiscussionboardAdminArticlesView_statsController } from "./controllers/discussionBoard/admin/articles/view-stats/DiscussionboardAdminArticlesView_statsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminBackup_recordsController } from "./controllers/discussionBoard/admin/backup-records/DiscussionboardAdminBackup_recordsController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminBansAppealsController } from "./controllers/discussionBoard/admin/bans/appeals/DiscussionboardAdminBansAppealsController";
import { DiscussionboardAdminBrowseController } from "./controllers/discussionBoard/admin/browse/DiscussionboardAdminBrowseController";
import { DiscussionboardAdminComment_rate_limitsController } from "./controllers/discussionBoard/admin/comment-rate-limits/DiscussionboardAdminComment_rate_limitsController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardAdminCommentsBulk_moderationsController } from "./controllers/discussionBoard/admin/comments/bulk-moderations/DiscussionboardAdminCommentsBulk_moderationsController";
import { DiscussionboardAdminCommentsEdit_historiesController } from "./controllers/discussionBoard/admin/comments/edit-histories/DiscussionboardAdminCommentsEdit_historiesController";
import { DiscussionboardAdminCommentsFlagsController } from "./controllers/discussionBoard/admin/comments/flags/DiscussionboardAdminCommentsFlagsController";
import { DiscussionboardAdminCommentsModerationDashboardController } from "./controllers/discussionBoard/admin/comments/moderation/dashboard/DiscussionboardAdminCommentsModerationDashboardController";
import { DiscussionboardAdminCommentsModerationsController } from "./controllers/discussionBoard/admin/comments/moderations/DiscussionboardAdminCommentsModerationsController";
import { DiscussionboardAdminCommentsReportsController } from "./controllers/discussionBoard/admin/comments/reports/DiscussionboardAdminCommentsReportsController";
import { DiscussionboardAdminCommentsSnapshotsController } from "./controllers/discussionBoard/admin/comments/snapshots/DiscussionboardAdminCommentsSnapshotsController";
import { DiscussionboardAdminContent_flagsController } from "./controllers/discussionBoard/admin/content-flags/DiscussionboardAdminContent_flagsController";
import { DiscussionboardAdminContent_moderation_logsController } from "./controllers/discussionBoard/admin/content-moderation-logs/DiscussionboardAdminContent_moderation_logsController";
import { DiscussionboardAdminDashboardController } from "./controllers/discussionBoard/admin/dashboard/DiscussionboardAdminDashboardController";
import { DiscussionboardAdminData_retention_policiesController } from "./controllers/discussionBoard/admin/data-retention-policies/DiscussionboardAdminData_retention_policiesController";
import { DiscussionboardAdminData_retention_policy_data_type_mappingsController } from "./controllers/discussionBoard/admin/data-retention-policy-data-type-mappings/DiscussionboardAdminData_retention_policy_data_type_mappingsController";
import { DiscussionboardAdminError_logsController } from "./controllers/discussionBoard/admin/error-logs/DiscussionboardAdminError_logsController";
import { DiscussionboardAdminFlagsController } from "./controllers/discussionBoard/admin/flags/DiscussionboardAdminFlagsController";
import { DiscussionboardAdminLogsController } from "./controllers/discussionBoard/admin/logs/DiscussionboardAdminLogsController";
import { DiscussionboardAdminMaintenance_schedulesController } from "./controllers/discussionBoard/admin/maintenance-schedules/DiscussionboardAdminMaintenance_schedulesController";
import { DiscussionboardAdminModerated_content_historiesController } from "./controllers/discussionBoard/admin/moderated-content-histories/DiscussionboardAdminModerated_content_historiesController";
import { DiscussionboardAdminModeration_logsController } from "./controllers/discussionBoard/admin/moderation-logs/DiscussionboardAdminModeration_logsController";
import { DiscussionboardAdminModeration_queuesController } from "./controllers/discussionBoard/admin/moderation-queues/DiscussionboardAdminModeration_queuesController";
import { DiscussionboardAdminModerationController } from "./controllers/discussionBoard/admin/moderation/statistics/DiscussionboardAdminModerationController";
import { DiscussionboardAdminPerformance_metricsController } from "./controllers/discussionBoard/admin/performance-metrics/DiscussionboardAdminPerformance_metricsController";
import { DiscussionboardAdminQueuesController } from "./controllers/discussionBoard/admin/queues/DiscussionboardAdminQueuesController";
import { DiscussionboardAdminRecently_activeController } from "./controllers/discussionBoard/admin/recently-active/DiscussionboardAdminRecently_activeController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsAdministratorsController } from "./controllers/discussionBoard/admin/sections/administrators/DiscussionboardAdminSectionsAdministratorsController";
import { DiscussionboardAdminSectionsArchivesController } from "./controllers/discussionBoard/admin/sections/archives/DiscussionboardAdminSectionsArchivesController";
import { DiscussionboardAdminSectionsFilesController } from "./controllers/discussionBoard/admin/sections/files/DiscussionboardAdminSectionsFilesController";
import { DiscussionboardAdminSectionsImagesController } from "./controllers/discussionBoard/admin/sections/images/DiscussionboardAdminSectionsImagesController";
import { DiscussionboardAdminSectionsSnapshotsController } from "./controllers/discussionBoard/admin/sections/snapshots/DiscussionboardAdminSectionsSnapshotsController";
import { DiscussionboardAdminSectionsStatisticsController } from "./controllers/discussionBoard/admin/sections/statistics/DiscussionboardAdminSectionsStatisticsController";
import { DiscussionboardAdminSecurity_eventsController } from "./controllers/discussionBoard/admin/security-events/DiscussionboardAdminSecurity_eventsController";
import { DiscussionboardAdminSystem_activitiesController } from "./controllers/discussionBoard/admin/system-activities/DiscussionboardAdminSystem_activitiesController";
import { DiscussionboardAdminSystem_configurationsController } from "./controllers/discussionBoard/admin/system-configurations/DiscussionboardAdminSystem_configurationsController";
import { DiscussionboardAdminSystemAnalyticsSecurityController } from "./controllers/discussionBoard/admin/system/analytics/security/DiscussionboardAdminSystemAnalyticsSecurityController";
import { DiscussionboardAdminSystemOverviewController } from "./controllers/discussionBoard/admin/system/overview/DiscussionboardAdminSystemOverviewController";
import { DiscussionboardAdminSystemReportsSummaryController } from "./controllers/discussionBoard/admin/system/reports/summary/DiscussionboardAdminSystemReportsSummaryController";
import { DiscussionboardAdminUser_bansController } from "./controllers/discussionBoard/admin/user-bans/DiscussionboardAdminUser_bansController";
import { DiscussionboardAdminUsersSearchController } from "./controllers/discussionBoard/admin/users/search/DiscussionboardAdminUsersSearchController";
import { DiscussionboardAdminsController } from "./controllers/discussionBoard/admins/DiscussionboardAdminsController";
import { DiscussionboardArticlesComment_pagination_settingsController } from "./controllers/discussionBoard/articles/comment-pagination-settings/DiscussionboardArticlesComment_pagination_settingsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesCommentsVotesController } from "./controllers/discussionBoard/articles/comments/votes/DiscussionboardArticlesCommentsVotesController";
import { DiscussionboardArticlesView_stat_eventsController } from "./controllers/discussionBoard/articles/view-stat-events/DiscussionboardArticlesView_stat_eventsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthSuperadminController } from "./controllers/discussionBoard/auth/superAdmin/DiscussionboardAuthSuperadminController";
import { DiscussionboardAuthUserController } from "./controllers/discussionBoard/auth/user/DiscussionboardAuthUserController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSuper_adminsController } from "./controllers/discussionBoard/super-admins/DiscussionboardSuper_adminsController";
import { DiscussionboardSuperadminAdministrator_grade_changesController } from "./controllers/discussionBoard/superAdmin/administrator-grade-changes/DiscussionboardSuperadminAdministrator_grade_changesController";
import { DiscussionboardSuperadminAdministrator_promotion_approvalsController } from "./controllers/discussionBoard/superAdmin/administrator-promotion-approvals/DiscussionboardSuperadminAdministrator_promotion_approvalsController";
import { DiscussionboardSuperadminAdministratorsController } from "./controllers/discussionBoard/superAdmin/administrators/DiscussionboardSuperadminAdministratorsController";
import { DiscussionboardSuperadminAdministratorsCapabilitiesController } from "./controllers/discussionBoard/superAdmin/administrators/capabilities/DiscussionboardSuperadminAdministratorsCapabilitiesController";
import { DiscussionboardSuperadminAnalyticsController } from "./controllers/discussionBoard/superAdmin/analytics/DiscussionboardSuperadminAnalyticsController";
import { DiscussionboardSuperadminAnalyticsArticle_viewsController } from "./controllers/discussionBoard/superAdmin/analytics/article-views/DiscussionboardSuperadminAnalyticsArticle_viewsController";
import { DiscussionboardSuperadminAnalyticsSectionsController } from "./controllers/discussionBoard/superAdmin/analytics/sections/DiscussionboardSuperadminAnalyticsSectionsController";
import { DiscussionboardSuperadminAnalyticsUser_activityController } from "./controllers/discussionBoard/superAdmin/analytics/user-activity/DiscussionboardSuperadminAnalyticsUser_activityController";
import { DiscussionboardSuperadminApi_rate_limitsController } from "./controllers/discussionBoard/superAdmin/api-rate-limits/DiscussionboardSuperadminApi_rate_limitsController";
import { DiscussionboardSuperadminAppealsController } from "./controllers/discussionBoard/superAdmin/appeals/DiscussionboardSuperadminAppealsController";
import { DiscussionboardSuperadminArticle_draftsController } from "./controllers/discussionBoard/superAdmin/article-drafts/DiscussionboardSuperadminArticle_draftsController";
import { DiscussionboardSuperadminArticles_draftsController } from "./controllers/discussionBoard/superAdmin/articles-drafts/DiscussionboardSuperadminArticles_draftsController";
import { DiscussionboardSuperadminArticles_draftsOwnController } from "./controllers/discussionBoard/superAdmin/articles-drafts/own/DiscussionboardSuperadminArticles_draftsOwnController";
import { DiscussionboardSuperadminArticlesController } from "./controllers/discussionBoard/superAdmin/articles/DiscussionboardSuperadminArticlesController";
import { DiscussionboardSuperadminArticlesFavoritesController } from "./controllers/discussionBoard/superAdmin/articles/favorites/DiscussionboardSuperadminArticlesFavoritesController";
import { DiscussionboardSuperadminArticlesFilesController } from "./controllers/discussionBoard/superAdmin/articles/files/DiscussionboardSuperadminArticlesFilesController";
import { DiscussionboardSuperadminArticlesImagesController } from "./controllers/discussionBoard/superAdmin/articles/images/DiscussionboardSuperadminArticlesImagesController";
import { DiscussionboardSuperadminArticlesSnapshotsController } from "./controllers/discussionBoard/superAdmin/articles/snapshots/DiscussionboardSuperadminArticlesSnapshotsController";
import { DiscussionboardSuperadminArticlesTagsController } from "./controllers/discussionBoard/superAdmin/articles/tags/DiscussionboardSuperadminArticlesTagsController";
import { DiscussionboardSuperadminArticlesView_statsController } from "./controllers/discussionBoard/superAdmin/articles/view-stats/DiscussionboardSuperadminArticlesView_statsController";
import { DiscussionboardSuperadminAudit_logsController } from "./controllers/discussionBoard/superAdmin/audit-logs/DiscussionboardSuperadminAudit_logsController";
import { DiscussionboardSuperadminBackup_recordsController } from "./controllers/discussionBoard/superAdmin/backup-records/DiscussionboardSuperadminBackup_recordsController";
import { DiscussionboardSuperadminBan_durationsController } from "./controllers/discussionBoard/superAdmin/ban-durations/DiscussionboardSuperadminBan_durationsController";
import { DiscussionboardSuperadminBan_reason_categoriesController } from "./controllers/discussionBoard/superAdmin/ban-reason-categories/DiscussionboardSuperadminBan_reason_categoriesController";
import { DiscussionboardSuperadminBrowseController } from "./controllers/discussionBoard/superAdmin/browse/DiscussionboardSuperadminBrowseController";
import { DiscussionboardSuperadminCommentsAnalyticsController } from "./controllers/discussionBoard/superAdmin/comments/analytics/DiscussionboardSuperadminCommentsAnalyticsController";
import { DiscussionboardSuperadminContent_moderation_logsController } from "./controllers/discussionBoard/superAdmin/content-moderation-logs/DiscussionboardSuperadminContent_moderation_logsController";
import { DiscussionboardSuperadminData_retention_policiesController } from "./controllers/discussionBoard/superAdmin/data-retention-policies/DiscussionboardSuperadminData_retention_policiesController";
import { DiscussionboardSuperadminData_retention_policy_data_type_mappingsController } from "./controllers/discussionBoard/superAdmin/data-retention-policy-data-type-mappings/DiscussionboardSuperadminData_retention_policy_data_type_mappingsController";
import { DiscussionboardSuperadminError_logsController } from "./controllers/discussionBoard/superAdmin/error-logs/DiscussionboardSuperadminError_logsController";
import { DiscussionboardSuperadminFlagsController } from "./controllers/discussionBoard/superAdmin/flags/DiscussionboardSuperadminFlagsController";
import { DiscussionboardSuperadminLogsController } from "./controllers/discussionBoard/superAdmin/logs/DiscussionboardSuperadminLogsController";
import { DiscussionboardSuperadminMaintenance_schedulesController } from "./controllers/discussionBoard/superAdmin/maintenance-schedules/DiscussionboardSuperadminMaintenance_schedulesController";
import { DiscussionboardSuperadminModerated_content_historiesController } from "./controllers/discussionBoard/superAdmin/moderated-content-histories/DiscussionboardSuperadminModerated_content_historiesController";
import { DiscussionboardSuperadminModeration_action_typesController } from "./controllers/discussionBoard/superAdmin/moderation-action-types/DiscussionboardSuperadminModeration_action_typesController";
import { DiscussionboardSuperadminModeration_logsController } from "./controllers/discussionBoard/superAdmin/moderation-logs/DiscussionboardSuperadminModeration_logsController";
import { DiscussionboardSuperadminModerationController } from "./controllers/discussionBoard/superAdmin/moderation/statistics/DiscussionboardSuperadminModerationController";
import { DiscussionboardSuperadminOverviewController } from "./controllers/discussionBoard/superAdmin/overview/DiscussionboardSuperadminOverviewController";
import { DiscussionboardSuperadminPerformance_metricsController } from "./controllers/discussionBoard/superAdmin/performance-metrics/DiscussionboardSuperadminPerformance_metricsController";
import { DiscussionboardSuperadminPromotion_analyticsController } from "./controllers/discussionBoard/superAdmin/promotion-analytics/DiscussionboardSuperadminPromotion_analyticsController";
import { DiscussionboardSuperadminPromotion_requestsController } from "./controllers/discussionBoard/superAdmin/promotion-requests/DiscussionboardSuperadminPromotion_requestsController";
import { DiscussionboardSuperadminPromotion_requestsWorkflowsController } from "./controllers/discussionBoard/superAdmin/promotion-requests/workflows/DiscussionboardSuperadminPromotion_requestsWorkflowsController";
import { DiscussionboardSuperadminQueuesController } from "./controllers/discussionBoard/superAdmin/queues/DiscussionboardSuperadminQueuesController";
import { DiscussionboardSuperadminRecently_activeController } from "./controllers/discussionBoard/superAdmin/recently-active/DiscussionboardSuperadminRecently_activeController";
import { DiscussionboardSuperadminSectionsController } from "./controllers/discussionBoard/superAdmin/sections/DiscussionboardSuperadminSectionsController";
import { DiscussionboardSuperadminSectionsAdministratorsController } from "./controllers/discussionBoard/superAdmin/sections/administrators/DiscussionboardSuperadminSectionsAdministratorsController";
import { DiscussionboardSuperadminSectionsArchivesController } from "./controllers/discussionBoard/superAdmin/sections/archives/DiscussionboardSuperadminSectionsArchivesController";
import { DiscussionboardSuperadminSectionsFilesController } from "./controllers/discussionBoard/superAdmin/sections/files/DiscussionboardSuperadminSectionsFilesController";
import { DiscussionboardSuperadminSectionsImagesController } from "./controllers/discussionBoard/superAdmin/sections/images/DiscussionboardSuperadminSectionsImagesController";
import { DiscussionboardSuperadminSectionsSnapshotsController } from "./controllers/discussionBoard/superAdmin/sections/snapshots/DiscussionboardSuperadminSectionsSnapshotsController";
import { DiscussionboardSuperadminSectionsStatisticsController } from "./controllers/discussionBoard/superAdmin/sections/statistics/DiscussionboardSuperadminSectionsStatisticsController";
import { DiscussionboardSuperadminSecurity_eventsController } from "./controllers/discussionBoard/superAdmin/security-events/DiscussionboardSuperadminSecurity_eventsController";
import { DiscussionboardSuperadminStatisticsController } from "./controllers/discussionBoard/superAdmin/statistics/DiscussionboardSuperadminStatisticsController";
import { DiscussionboardSuperadminSuper_adminsEmail_verificationsController } from "./controllers/discussionBoard/superAdmin/super-admins/email-verifications/DiscussionboardSuperadminSuper_adminsEmail_verificationsController";
import { DiscussionboardSuperadminSuper_adminsPassword_resetsController } from "./controllers/discussionBoard/superAdmin/super-admins/password-resets/DiscussionboardSuperadminSuper_adminsPassword_resetsController";
import { DiscussionboardSuperadminSuper_adminsProfileController } from "./controllers/discussionBoard/superAdmin/super-admins/profile/DiscussionboardSuperadminSuper_adminsProfileController";
import { DiscussionboardSuperadminSuper_adminsSessionsController } from "./controllers/discussionBoard/superAdmin/super-admins/sessions/DiscussionboardSuperadminSuper_adminsSessionsController";
import { DiscussionboardSuperadminSystem_activitiesController } from "./controllers/discussionBoard/superAdmin/system-activities/DiscussionboardSuperadminSystem_activitiesController";
import { DiscussionboardSuperadminSystem_configurationsController } from "./controllers/discussionBoard/superAdmin/system-configurations/DiscussionboardSuperadminSystem_configurationsController";
import { DiscussionboardSuperadminSystemAnalyticsErrorsController } from "./controllers/discussionBoard/superAdmin/system/analytics/errors/DiscussionboardSuperadminSystemAnalyticsErrorsController";
import { DiscussionboardSuperadminSystemAnalyticsSecurityController } from "./controllers/discussionBoard/superAdmin/system/analytics/security/DiscussionboardSuperadminSystemAnalyticsSecurityController";
import { DiscussionboardSuperadminSystemMetricsPerformanceController } from "./controllers/discussionBoard/superAdmin/system/metrics/performance/DiscussionboardSuperadminSystemMetricsPerformanceController";
import { DiscussionboardSuperadminSystemOverviewController } from "./controllers/discussionBoard/superAdmin/system/overview/DiscussionboardSuperadminSystemOverviewController";
import { DiscussionboardSuperadminSystemReportsAuditController } from "./controllers/discussionBoard/superAdmin/system/reports/audit/DiscussionboardSuperadminSystemReportsAuditController";
import { DiscussionboardSuperadminSystemReportsData_retentionController } from "./controllers/discussionBoard/superAdmin/system/reports/data-retention/DiscussionboardSuperadminSystemReportsData_retentionController";
import { DiscussionboardSuperadminSystemReportsSummaryController } from "./controllers/discussionBoard/superAdmin/system/reports/summary/DiscussionboardSuperadminSystemReportsSummaryController";
import { DiscussionboardSuperadminUser_bansController } from "./controllers/discussionBoard/superAdmin/user-bans/DiscussionboardSuperadminUser_bansController";
import { DiscussionboardUserAppealsController } from "./controllers/discussionBoard/user/appeals/DiscussionboardUserAppealsController";
import { DiscussionboardUserAppealsMyController } from "./controllers/discussionBoard/user/appeals/my/DiscussionboardUserAppealsMyController";
import { DiscussionboardUserArticle_draftsController } from "./controllers/discussionBoard/user/article-drafts/DiscussionboardUserArticle_draftsController";
import { DiscussionboardUserArticles_draftsController } from "./controllers/discussionBoard/user/articles-drafts/DiscussionboardUserArticles_draftsController";
import { DiscussionboardUserArticles_draftsOwnController } from "./controllers/discussionBoard/user/articles-drafts/own/DiscussionboardUserArticles_draftsOwnController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardUserArticlesCommentsController } from "./controllers/discussionBoard/user/articles/comments/DiscussionboardUserArticlesCommentsController";
import { DiscussionboardUserArticlesCommentsVotesController } from "./controllers/discussionBoard/user/articles/comments/votes/DiscussionboardUserArticlesCommentsVotesController";
import { DiscussionboardUserArticlesFavoritesController } from "./controllers/discussionBoard/user/articles/favorites/DiscussionboardUserArticlesFavoritesController";
import { DiscussionboardUserArticlesFilesController } from "./controllers/discussionBoard/user/articles/files/DiscussionboardUserArticlesFilesController";
import { DiscussionboardUserArticlesImagesController } from "./controllers/discussionBoard/user/articles/images/DiscussionboardUserArticlesImagesController";
import { DiscussionboardUserArticlesSearchTagsController } from "./controllers/discussionBoard/user/articles/search/tags/DiscussionboardUserArticlesSearchTagsController";
import { DiscussionboardUserArticlesSnapshotsController } from "./controllers/discussionBoard/user/articles/snapshots/DiscussionboardUserArticlesSnapshotsController";
import { DiscussionboardUserArticlesTagsController } from "./controllers/discussionBoard/user/articles/tags/DiscussionboardUserArticlesTagsController";
import { DiscussionboardUserArticlesView_statsController } from "./controllers/discussionBoard/user/articles/view-stats/DiscussionboardUserArticlesView_statsController";
import { DiscussionboardUserBansAppealsController } from "./controllers/discussionBoard/user/bans/appeals/DiscussionboardUserBansAppealsController";
import { DiscussionboardUserBansMy_banController } from "./controllers/discussionBoard/user/bans/my-ban/DiscussionboardUserBansMy_banController";
import { DiscussionboardUserBansMy_banAppealsController } from "./controllers/discussionBoard/user/bans/my-ban/appeals/DiscussionboardUserBansMy_banAppealsController";
import { DiscussionboardUserBrowseController } from "./controllers/discussionBoard/user/browse/DiscussionboardUserBrowseController";
import { DiscussionboardUserCommentsController } from "./controllers/discussionBoard/user/comments/DiscussionboardUserCommentsController";
import { DiscussionboardUserCommentsEdit_historiesController } from "./controllers/discussionBoard/user/comments/edit-histories/DiscussionboardUserCommentsEdit_historiesController";
import { DiscussionboardUserCommentsFlagsController } from "./controllers/discussionBoard/user/comments/flags/DiscussionboardUserCommentsFlagsController";
import { DiscussionboardUserCommentsMy_statisticsController } from "./controllers/discussionBoard/user/comments/my-statistics/DiscussionboardUserCommentsMy_statisticsController";
import { DiscussionboardUserCommentsMy_voteController } from "./controllers/discussionBoard/user/comments/my-vote/DiscussionboardUserCommentsMy_voteController";
import { DiscussionboardUserCommentsReportsController } from "./controllers/discussionBoard/user/comments/reports/DiscussionboardUserCommentsReportsController";
import { DiscussionboardUserContent_flagsController } from "./controllers/discussionBoard/user/content-flags/DiscussionboardUserContent_flagsController";
import { DiscussionboardUserContent_flagsMy_flagsController } from "./controllers/discussionBoard/user/content-flags/my-flags/DiscussionboardUserContent_flagsMy_flagsController";
import { DiscussionboardUser_exportController } from "./controllers/discussionBoard/user/export/DiscussionboardUser_exportController";
import { DiscussionboardUserProfileSectionsPreferencesController } from "./controllers/discussionBoard/user/profile/sections/preferences/DiscussionboardUserProfileSectionsPreferencesController";
import { DiscussionboardUserPromotion_requestsController } from "./controllers/discussionBoard/user/promotion-requests/DiscussionboardUserPromotion_requestsController";
import { DiscussionboardUserRecently_activeController } from "./controllers/discussionBoard/user/recently-active/DiscussionboardUserRecently_activeController";
import { DiscussionboardUserSearchArticlesController } from "./controllers/discussionBoard/user/search/articles/DiscussionboardUserSearchArticlesController";
import { DiscussionboardUserStatsController } from "./controllers/discussionBoard/user/stats/DiscussionboardUserStatsController";
import { DiscussionboardUserUsersEmail_verificationsController } from "./controllers/discussionBoard/user/users/email-verifications/DiscussionboardUserUsersEmail_verificationsController";
import { DiscussionboardUserUsersPassword_resetsController } from "./controllers/discussionBoard/user/users/password-resets/DiscussionboardUserUsersPassword_resetsController";
import { DiscussionboardUserUsersProfileController } from "./controllers/discussionBoard/user/users/profile/DiscussionboardUserUsersProfileController";
import { DiscussionboardUserUsersSessionsController } from "./controllers/discussionBoard/user/users/sessions/DiscussionboardUserUsersSessionsController";
import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";

@Module({
  controllers: [
    DiscussionboardAuthUserController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuperadminController,
    DiscussionboardUsersController,
    DiscussionboardUserUsersProfileController,
    DiscussionboardAdminsController,
    DiscussionboardAdminAdminsProfileController,
    DiscussionboardSuper_adminsController,
    DiscussionboardSuperadminSuper_adminsProfileController,
    DiscussionboardUserUsersSessionsController,
    DiscussionboardUserUsersPassword_resetsController,
    DiscussionboardUserUsersEmail_verificationsController,
    DiscussionboardAdminAdminsSessionsController,
    DiscussionboardAdminAdminsPassword_resetsController,
    DiscussionboardAdminAdminsEmail_verificationsController,
    DiscussionboardSuperadminSuper_adminsSessionsController,
    DiscussionboardSuperadminSuper_adminsPassword_resetsController,
    DiscussionboardSuperadminSuper_adminsEmail_verificationsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardSuperadminSectionsController,
    DiscussionboardAdminSectionsSnapshotsController,
    DiscussionboardSuperadminSectionsSnapshotsController,
    DiscussionboardAdminSectionsStatisticsController,
    DiscussionboardSuperadminSectionsStatisticsController,
    DiscussionboardAdminSectionsAdministratorsController,
    DiscussionboardSuperadminSectionsAdministratorsController,
    DiscussionboardUserProfileSectionsPreferencesController,
    DiscussionboardAdminSectionsArchivesController,
    DiscussionboardSuperadminSectionsArchivesController,
    DiscussionboardAdminSectionsFilesController,
    DiscussionboardSuperadminSectionsFilesController,
    DiscussionboardAdminSectionsImagesController,
    DiscussionboardSuperadminSectionsImagesController,
    DiscussionboardUserArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardSuperadminArticlesController,
    DiscussionboardUserArticles_draftsController,
    DiscussionboardAdminArticles_draftsController,
    DiscussionboardSuperadminArticles_draftsController,
    DiscussionboardUserArticle_draftsController,
    DiscussionboardAdminArticle_draftsController,
    DiscussionboardSuperadminArticle_draftsController,
    DiscussionboardUserArticlesFilesController,
    DiscussionboardAdminArticlesFilesController,
    DiscussionboardSuperadminArticlesFilesController,
    DiscussionboardUserArticlesImagesController,
    DiscussionboardAdminArticlesImagesController,
    DiscussionboardSuperadminArticlesImagesController,
    DiscussionboardUserArticlesTagsController,
    DiscussionboardAdminArticlesTagsController,
    DiscussionboardSuperadminArticlesTagsController,
    DiscussionboardUserArticlesView_statsController,
    DiscussionboardAdminArticlesView_statsController,
    DiscussionboardSuperadminArticlesView_statsController,
    DiscussionboardArticlesView_stat_eventsController,
    DiscussionboardUserArticlesFavoritesController,
    DiscussionboardAdminArticlesFavoritesController,
    DiscussionboardSuperadminArticlesFavoritesController,
    DiscussionboardUserArticlesSnapshotsController,
    DiscussionboardAdminArticlesSnapshotsController,
    DiscussionboardSuperadminArticlesSnapshotsController,
    DiscussionboardUserArticles_draftsOwnController,
    DiscussionboardAdminArticles_draftsOwnController,
    DiscussionboardSuperadminArticles_draftsOwnController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardUserArticlesCommentsController,
    DiscussionboardArticlesCommentsVotesController,
    DiscussionboardUserArticlesCommentsVotesController,
    DiscussionboardAdminCommentsFlagsController,
    DiscussionboardUserCommentsFlagsController,
    DiscussionboardAdminCommentsReportsController,
    DiscussionboardUserCommentsReportsController,
    DiscussionboardUserCommentsEdit_historiesController,
    DiscussionboardAdminCommentsEdit_historiesController,
    DiscussionboardAdminCommentsSnapshotsController,
    DiscussionboardAdminCommentsModerationsController,
    DiscussionboardArticlesComment_pagination_settingsController,
    DiscussionboardAdminArticlesComment_pagination_settingsController,
    DiscussionboardAdminComment_rate_limitsController,
    DiscussionboardUserCommentsMy_voteController,
    DiscussionboardAdminCommentsController,
    DiscussionboardSuperadminAdministratorsController,
    DiscussionboardAdminUser_bansController,
    DiscussionboardSuperadminUser_bansController,
    DiscussionboardSuperadminPromotion_requestsWorkflowsController,
    DiscussionboardSuperadminAdministratorsCapabilitiesController,
    DiscussionboardUserPromotion_requestsController,
    DiscussionboardSuperadminPromotion_requestsController,
    DiscussionboardAdminBansController,
    DiscussionboardAdminBansAppealsController,
    DiscussionboardUserBansAppealsController,
    DiscussionboardSuperadminBan_durationsController,
    DiscussionboardSuperadminBan_reason_categoriesController,
    DiscussionboardAdminContent_flagsController,
    DiscussionboardUserContent_flagsController,
    DiscussionboardAdminModeration_queuesController,
    DiscussionboardAdminModeration_logsController,
    DiscussionboardSuperadminModeration_logsController,
    DiscussionboardAdminModerated_content_historiesController,
    DiscussionboardSuperadminModerated_content_historiesController,
    DiscussionboardSuperadminModeration_action_typesController,
    DiscussionboardSuperadminAdministrator_grade_changesController,
    DiscussionboardUserBansMy_banController,
    DiscussionboardUserBansMy_banAppealsController,
    DiscussionboardUserContent_flagsMy_flagsController,
    DiscussionboardAdminSystem_configurationsController,
    DiscussionboardSuperadminSystem_configurationsController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardSuperadminAudit_logsController,
    DiscussionboardAdminAdministrator_promotion_approvalsController,
    DiscussionboardSuperadminAdministrator_promotion_approvalsController,
    DiscussionboardAdminContent_moderation_logsController,
    DiscussionboardSuperadminContent_moderation_logsController,
    DiscussionboardAdminSystem_activitiesController,
    DiscussionboardSuperadminSystem_activitiesController,
    DiscussionboardAdminPerformance_metricsController,
    DiscussionboardSuperadminPerformance_metricsController,
    DiscussionboardAdminError_logsController,
    DiscussionboardSuperadminError_logsController,
    DiscussionboardAdminBackup_recordsController,
    DiscussionboardSuperadminBackup_recordsController,
    DiscussionboardAdminMaintenance_schedulesController,
    DiscussionboardSuperadminMaintenance_schedulesController,
    DiscussionboardAdminApi_rate_limitsController,
    DiscussionboardSuperadminApi_rate_limitsController,
    DiscussionboardAdminSecurity_eventsController,
    DiscussionboardSuperadminSecurity_eventsController,
    DiscussionboardAdminData_retention_policiesController,
    DiscussionboardSuperadminData_retention_policiesController,
    DiscussionboardAdminData_retention_policy_data_type_mappingsController,
    DiscussionboardSuperadminData_retention_policy_data_type_mappingsController,
    DiscussionboardUserStatsController,
    DiscussionboardUserBrowseController,
    DiscussionboardAdminDashboardController,
    DiscussionboardSuperadminOverviewController,
    DiscussionboardAdminUsersSearchController,
    DiscussionboardUser_exportController,
    DiscussionboardSuperadminPromotion_analyticsController,
    DiscussionboardAdminAnalyticsController,
    DiscussionboardSuperadminAnalyticsController,
    DiscussionboardUserRecently_activeController,
    DiscussionboardAdminRecently_activeController,
    DiscussionboardSuperadminRecently_activeController,
    DiscussionboardAdminBrowseController,
    DiscussionboardSuperadminBrowseController,
    DiscussionboardUserSearchArticlesController,
    DiscussionboardUserArticlesSearchTagsController,
    DiscussionboardAdminAnalyticsArticle_viewsController,
    DiscussionboardSuperadminAnalyticsArticle_viewsController,
    DiscussionboardAdminAnalyticsSectionsController,
    DiscussionboardSuperadminAnalyticsSectionsController,
    DiscussionboardAdminAnalyticsUser_activityController,
    DiscussionboardSuperadminAnalyticsUser_activityController,
    DiscussionboardUserCommentsController,
    DiscussionboardAdminCommentsModerationDashboardController,
    DiscussionboardUserCommentsMy_statisticsController,
    DiscussionboardSuperadminCommentsAnalyticsController,
    DiscussionboardAdminCommentsBulk_moderationsController,
    DiscussionboardSuperadminStatisticsController,
    DiscussionboardAdminAppealsController,
    DiscussionboardSuperadminAppealsController,
    DiscussionboardAdminModerationController,
    DiscussionboardSuperadminModerationController,
    DiscussionboardAdminFlagsController,
    DiscussionboardSuperadminFlagsController,
    DiscussionboardAdminQueuesController,
    DiscussionboardSuperadminQueuesController,
    DiscussionboardAdminLogsController,
    DiscussionboardSuperadminLogsController,
    DiscussionboardUserAppealsController,
    DiscussionboardUserAppealsMyController,
    DiscussionboardAdminSystemOverviewController,
    DiscussionboardSuperadminSystemOverviewController,
    DiscussionboardSuperadminSystemMetricsPerformanceController,
    DiscussionboardAdminSystemAnalyticsSecurityController,
    DiscussionboardSuperadminSystemAnalyticsSecurityController,
    DiscussionboardSuperadminSystemReportsAuditController,
    DiscussionboardSuperadminSystemAnalyticsErrorsController,
    DiscussionboardSuperadminSystemReportsData_retentionController,
    DiscussionboardAdminSystemReportsSummaryController,
    DiscussionboardSuperadminSystemReportsSummaryController,
  ],
})
export class MyModule {}
