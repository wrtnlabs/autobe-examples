import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdministratorsController } from "./controllers/discussionBoard/admin/administrators/DiscussionboardAdminAdministratorsController";
import { DiscussionboardAdminAdministratorsCapabilitiesController } from "./controllers/discussionBoard/admin/administrators/capabilities/DiscussionboardAdminAdministratorsCapabilitiesController";
import { DiscussionboardAdminAdministratorsDashboardController } from "./controllers/discussionBoard/admin/administrators/dashboard/DiscussionboardAdminAdministratorsDashboardController";
import { DiscussionboardAdminAdministratorsGrade_changesController } from "./controllers/discussionBoard/admin/administrators/grade-changes/DiscussionboardAdminAdministratorsGrade_changesController";
import { DiscussionboardAdminAnalyticsController } from "./controllers/discussionBoard/admin/analytics/DiscussionboardAdminAnalyticsController";
import { DiscussionboardAdminAnalyticsBan_durationsController } from "./controllers/discussionBoard/admin/analytics/ban-durations/DiscussionboardAdminAnalyticsBan_durationsController";
import { DiscussionboardAdminAnalyticsBansController } from "./controllers/discussionBoard/admin/analytics/bans/DiscussionboardAdminAnalyticsBansController";
import { DiscussionboardAdminAnalyticsFlagsController } from "./controllers/discussionBoard/admin/analytics/flags/DiscussionboardAdminAnalyticsFlagsController";
import { DiscussionboardAdminAnalyticsModeration_action_typesController } from "./controllers/discussionBoard/admin/analytics/moderation-action-types/DiscussionboardAdminAnalyticsModeration_action_typesController";
import { DiscussionboardAdminAnalyticsModeration_efficiencyController } from "./controllers/discussionBoard/admin/analytics/moderation-efficiency/DiscussionboardAdminAnalyticsModeration_efficiencyController";
import { DiscussionboardAdminApi_rate_limitsController } from "./controllers/discussionBoard/admin/api-rate-limits/DiscussionboardAdminApi_rate_limitsController";
import { DiscussionboardAdminAppealsController } from "./controllers/discussionBoard/admin/appeals/review/DiscussionboardAdminAppealsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesComment_pagination_settingsController } from "./controllers/discussionBoard/admin/articles/comment-pagination-settings/DiscussionboardAdminArticlesComment_pagination_settingsController";
import { DiscussionboardAdminArticlesCommentsFlagsController } from "./controllers/discussionBoard/admin/articles/comments/flags/DiscussionboardAdminArticlesCommentsFlagsController";
import { DiscussionboardAdminArticlesCommentsModerationsController } from "./controllers/discussionBoard/admin/articles/comments/moderations/DiscussionboardAdminArticlesCommentsModerationsController";
import { DiscussionboardAdminArticlesCommentsReportsController } from "./controllers/discussionBoard/admin/articles/comments/reports/DiscussionboardAdminArticlesCommentsReportsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminBackup_recordsController } from "./controllers/discussionBoard/admin/backup-records/DiscussionboardAdminBackup_recordsController";
import { DiscussionboardAdminBan_durationsController } from "./controllers/discussionBoard/admin/ban-durations/DiscussionboardAdminBan_durationsController";
import { DiscussionboardAdminBan_reason_categoriesController } from "./controllers/discussionBoard/admin/ban-reason-categories/DiscussionboardAdminBan_reason_categoriesController";
import { DiscussionboardAdminBan_recordsController } from "./controllers/discussionBoard/admin/ban-records/DiscussionboardAdminBan_recordsController";
import { DiscussionboardAdminBan_recordsAppealsController } from "./controllers/discussionBoard/admin/ban-records/appeals/DiscussionboardAdminBan_recordsAppealsController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminBansAppealsController } from "./controllers/discussionBoard/admin/bans/appeals/DiscussionboardAdminBansAppealsController";
import { DiscussionboardAdminComment_rate_limitsController } from "./controllers/discussionBoard/admin/comment-rate-limits/DiscussionboardAdminComment_rate_limitsController";
import { DiscussionboardAdminCommentsModerationsController } from "./controllers/discussionBoard/admin/comments/moderations/DiscussionboardAdminCommentsModerationsController";
import { DiscussionboardAdminContent_flagsController } from "./controllers/discussionBoard/admin/content-flags/DiscussionboardAdminContent_flagsController";
import { DiscussionboardAdminContent_flagsModeration_queuesController } from "./controllers/discussionBoard/admin/content-flags/moderation-queues/DiscussionboardAdminContent_flagsModeration_queuesController";
import { DiscussionboardAdminContent_flagsModeration_queuesAssignmentsController } from "./controllers/discussionBoard/admin/content-flags/moderation-queues/assignments/DiscussionboardAdminContent_flagsModeration_queuesAssignmentsController";
import { DiscussionboardAdminContent_flagsModeration_queuesEscalationsController } from "./controllers/discussionBoard/admin/content-flags/moderation-queues/escalations/DiscussionboardAdminContent_flagsModeration_queuesEscalationsController";
import { DiscussionboardAdminContent_moderation_logsController } from "./controllers/discussionBoard/admin/content-moderation-logs/DiscussionboardAdminContent_moderation_logsController";
import { DiscussionboardAdminDashboardController } from "./controllers/discussionBoard/admin/dashboard/DiscussionboardAdminDashboardController";
import { DiscussionboardAdminDashboardAppealController } from "./controllers/discussionBoard/admin/dashboard/appeal/DiscussionboardAdminDashboardAppealController";
import { DiscussionboardAdminData_retention_policiesController } from "./controllers/discussionBoard/admin/data-retention-policies/DiscussionboardAdminData_retention_policiesController";
import { DiscussionboardAdminError_logsController } from "./controllers/discussionBoard/admin/error-logs/DiscussionboardAdminError_logsController";
import { DiscussionboardAdminError_logsAnalyticsController } from "./controllers/discussionBoard/admin/error-logs/analytics/DiscussionboardAdminError_logsAnalyticsController";
import { DiscussionboardAdminMaintenance_schedulesController } from "./controllers/discussionBoard/admin/maintenance-schedules/DiscussionboardAdminMaintenance_schedulesController";
import { DiscussionboardAdminModerated_content_historiesController } from "./controllers/discussionBoard/admin/moderated-content-histories/DiscussionboardAdminModerated_content_historiesController";
import { DiscussionboardAdminModeration_action_typesController } from "./controllers/discussionBoard/admin/moderation-action-types/DiscussionboardAdminModeration_action_typesController";
import { DiscussionboardAdminModeration_logsController } from "./controllers/discussionBoard/admin/moderation-logs/DiscussionboardAdminModeration_logsController";
import { DiscussionboardAdminModeration_queueController } from "./controllers/discussionBoard/admin/moderation-queue/DiscussionboardAdminModeration_queueController";
import { DiscussionboardAdminModeration_queuesAssignmentsController } from "./controllers/discussionBoard/admin/moderation-queues/assignments/DiscussionboardAdminModeration_queuesAssignmentsController";
import { DiscussionboardAdminOrdersController } from "./controllers/discussionBoard/admin/orders/DiscussionboardAdminOrdersController";
import { DiscussionboardAdminPerformance_metricsController } from "./controllers/discussionBoard/admin/performance-metrics/DiscussionboardAdminPerformance_metricsController";
import { DiscussionboardAdminPerformance_metricsAnalyticsController } from "./controllers/discussionBoard/admin/performance-metrics/analytics/DiscussionboardAdminPerformance_metricsAnalyticsController";
import { DiscussionboardAdminPromotion_approvalsController } from "./controllers/discussionBoard/admin/promotion-approvals/DiscussionboardAdminPromotion_approvalsController";
import { DiscussionboardAdminPromotion_requestsController } from "./controllers/discussionBoard/admin/promotion-requests/DiscussionboardAdminPromotion_requestsController";
import { DiscussionboardAdminController } from "./controllers/discussionBoard/admin/revoke/DiscussionboardAdminController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsArchivesController } from "./controllers/discussionBoard/admin/sections/archives/DiscussionboardAdminSectionsArchivesController";
import { DiscussionboardAdminSectionsAssignmentsController } from "./controllers/discussionBoard/admin/sections/assignments/DiscussionboardAdminSectionsAssignmentsController";
import { DiscussionboardAdminSectionsFilesController } from "./controllers/discussionBoard/admin/sections/files/DiscussionboardAdminSectionsFilesController";
import { DiscussionboardAdminSectionsImagesController } from "./controllers/discussionBoard/admin/sections/images/DiscussionboardAdminSectionsImagesController";
import { DiscussionboardAdminSectionsSnapshotsController } from "./controllers/discussionBoard/admin/sections/snapshots/DiscussionboardAdminSectionsSnapshotsController";
import { DiscussionboardAdminSecurity_eventsController } from "./controllers/discussionBoard/admin/security-events/DiscussionboardAdminSecurity_eventsController";
import { DiscussionboardAdminStatisticsController } from "./controllers/discussionBoard/admin/statistics/DiscussionboardAdminStatisticsController";
import { DiscussionboardAdminSystem_activitiesController } from "./controllers/discussionBoard/admin/system-activities/DiscussionboardAdminSystem_activitiesController";
import { DiscussionboardAdminSystem_configurationsController } from "./controllers/discussionBoard/admin/system-configurations/DiscussionboardAdminSystem_configurationsController";
import { DiscussionboardAdminSystem_configurationsValidationsController } from "./controllers/discussionBoard/admin/system-configurations/validations/DiscussionboardAdminSystem_configurationsValidationsController";
import { DiscussionboardAdminSystemHealthController } from "./controllers/discussionBoard/admin/system/health/DiscussionboardAdminSystemHealthController";
import { DiscussionboardAdminUsersStatisticsController } from "./controllers/discussionBoard/admin/users/statistics/DiscussionboardAdminUsersStatisticsController";
import { DiscussionboardAdminsController } from "./controllers/discussionBoard/admins/DiscussionboardAdminsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesComment_pagination_settingsController } from "./controllers/discussionBoard/articles/comment-pagination-settings/DiscussionboardArticlesComment_pagination_settingsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/articles/comments/attachments/DiscussionboardArticlesCommentsAttachmentsController";
import { DiscussionboardArticlesCommentsEdit_historiesController } from "./controllers/discussionBoard/articles/comments/edit-histories/DiscussionboardArticlesCommentsEdit_historiesController";
import { DiscussionboardArticlesCommentsMentionsController } from "./controllers/discussionBoard/articles/comments/mentions/DiscussionboardArticlesCommentsMentionsController";
import { DiscussionboardArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/articles/comments/snapshots/DiscussionboardArticlesCommentsSnapshotsController";
import { DiscussionboardArticlesCommentsVotesController } from "./controllers/discussionBoard/articles/comments/votes/DiscussionboardArticlesCommentsVotesController";
import { DiscussionboardArticlesFilesController } from "./controllers/discussionBoard/articles/files/DiscussionboardArticlesFilesController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardArticlesImagesFilesController } from "./controllers/discussionBoard/articles/images/files/DiscussionboardArticlesImagesFilesController";
import { DiscussionboardArticlesSnapshotsController } from "./controllers/discussionBoard/articles/snapshots/DiscussionboardArticlesSnapshotsController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardArticlesView_stat_eventsController } from "./controllers/discussionBoard/articles/view-stat-events/DiscussionboardArticlesView_stat_eventsController";
import { DiscussionboardArticlesView_statsController } from "./controllers/discussionBoard/articles/view-stats/DiscussionboardArticlesView_statsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthSuperadminController } from "./controllers/discussionBoard/auth/superAdmin/DiscussionboardAuthSuperadminController";
import { DiscussionboardAuthUserController } from "./controllers/discussionBoard/auth/user/DiscussionboardAuthUserController";
import { DiscussionboardBansAppealsController } from "./controllers/discussionBoard/bans/appeals/DiscussionboardBansAppealsController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSectionsStatisticsController } from "./controllers/discussionBoard/sections/statistics/DiscussionboardSectionsStatisticsController";
import { DiscussionboardSuper_adminsController } from "./controllers/discussionBoard/super-admins/DiscussionboardSuper_adminsController";
import { DiscussionboardSuperadminController } from "./controllers/discussionBoard/superAdmin/DiscussionboardSuperadminController";
import { DiscussionboardSuperadminAdministrator_grade_changesController } from "./controllers/discussionBoard/superAdmin/administrator-grade-changes/DiscussionboardSuperadminAdministrator_grade_changesController";
import { DiscussionboardSuperadminAdministratorsController } from "./controllers/discussionBoard/superAdmin/administrators/DiscussionboardSuperadminAdministratorsController";
import { DiscussionboardSuperadminAdministratorsCapabilitiesController } from "./controllers/discussionBoard/superAdmin/administrators/capabilities/DiscussionboardSuperadminAdministratorsCapabilitiesController";
import { DiscussionboardSuperadminAdministratorsDashboardController } from "./controllers/discussionBoard/superAdmin/administrators/dashboard/DiscussionboardSuperadminAdministratorsDashboardController";
import { DiscussionboardSuperadminAdministratorsGrade_changesController } from "./controllers/discussionBoard/superAdmin/administrators/grade-changes/DiscussionboardSuperadminAdministratorsGrade_changesController";
import { DiscussionboardSuperadminAnalyticsController } from "./controllers/discussionBoard/superAdmin/analytics/DiscussionboardSuperadminAnalyticsController";
import { DiscussionboardSuperadminAnalyticsBan_durationsController } from "./controllers/discussionBoard/superAdmin/analytics/ban-durations/DiscussionboardSuperadminAnalyticsBan_durationsController";
import { DiscussionboardSuperadminAnalyticsBansController } from "./controllers/discussionBoard/superAdmin/analytics/bans/DiscussionboardSuperadminAnalyticsBansController";
import { DiscussionboardSuperadminAnalyticsFlagsController } from "./controllers/discussionBoard/superAdmin/analytics/flags/DiscussionboardSuperadminAnalyticsFlagsController";
import { DiscussionboardSuperadminAnalyticsModeration_action_typesController } from "./controllers/discussionBoard/superAdmin/analytics/moderation-action-types/DiscussionboardSuperadminAnalyticsModeration_action_typesController";
import { DiscussionboardSuperadminAnalyticsModeration_efficiencyController } from "./controllers/discussionBoard/superAdmin/analytics/moderation-efficiency/DiscussionboardSuperadminAnalyticsModeration_efficiencyController";
import { DiscussionboardSuperadminApi_rate_limitsController } from "./controllers/discussionBoard/superAdmin/api-rate-limits/DiscussionboardSuperadminApi_rate_limitsController";
import { DiscussionboardSuperadminArticlesComment_pagination_settingsController } from "./controllers/discussionBoard/superAdmin/articles/comment-pagination-settings/DiscussionboardSuperadminArticlesComment_pagination_settingsController";
import { DiscussionboardSuperadminArticlesCommentsFlagsController } from "./controllers/discussionBoard/superAdmin/articles/comments/flags/DiscussionboardSuperadminArticlesCommentsFlagsController";
import { DiscussionboardSuperadminArticlesCommentsModerationsController } from "./controllers/discussionBoard/superAdmin/articles/comments/moderations/DiscussionboardSuperadminArticlesCommentsModerationsController";
import { DiscussionboardSuperadminArticlesCommentsReportsController } from "./controllers/discussionBoard/superAdmin/articles/comments/reports/DiscussionboardSuperadminArticlesCommentsReportsController";
import { DiscussionboardSuperadminAudit_logsController } from "./controllers/discussionBoard/superAdmin/audit-logs/DiscussionboardSuperadminAudit_logsController";
import { DiscussionboardSuperadminBackup_recordsController } from "./controllers/discussionBoard/superAdmin/backup-records/DiscussionboardSuperadminBackup_recordsController";
import { DiscussionboardSuperadminBackup_recordsOperationsController } from "./controllers/discussionBoard/superAdmin/backup-records/operations/DiscussionboardSuperadminBackup_recordsOperationsController";
import { DiscussionboardSuperadminBan_durationsController } from "./controllers/discussionBoard/superAdmin/ban-durations/DiscussionboardSuperadminBan_durationsController";
import { DiscussionboardSuperadminBan_reason_categoriesController } from "./controllers/discussionBoard/superAdmin/ban-reason-categories/DiscussionboardSuperadminBan_reason_categoriesController";
import { DiscussionboardSuperadminBan_recordsController } from "./controllers/discussionBoard/superAdmin/ban-records/DiscussionboardSuperadminBan_recordsController";
import { DiscussionboardSuperadminBan_recordsAppealsController } from "./controllers/discussionBoard/superAdmin/ban-records/appeals/DiscussionboardSuperadminBan_recordsAppealsController";
import { DiscussionboardSuperadminBansController } from "./controllers/discussionBoard/superAdmin/bans/DiscussionboardSuperadminBansController";
import { DiscussionboardSuperadminBansAppealsController } from "./controllers/discussionBoard/superAdmin/bans/appeals/DiscussionboardSuperadminBansAppealsController";
import { DiscussionboardSuperadminCapabilitiesController } from "./controllers/discussionBoard/superAdmin/capabilities/DiscussionboardSuperadminCapabilitiesController";
import { DiscussionboardSuperadminComment_rate_limitsController } from "./controllers/discussionBoard/superAdmin/comment-rate-limits/DiscussionboardSuperadminComment_rate_limitsController";
import { DiscussionboardSuperadminCommentsModerationsController } from "./controllers/discussionBoard/superAdmin/comments/moderations/DiscussionboardSuperadminCommentsModerationsController";
import { DiscussionboardSuperadminContent_flagsController } from "./controllers/discussionBoard/superAdmin/content-flags/DiscussionboardSuperadminContent_flagsController";
import { DiscussionboardSuperadminContent_flagsModeration_queuesController } from "./controllers/discussionBoard/superAdmin/content-flags/moderation-queues/DiscussionboardSuperadminContent_flagsModeration_queuesController";
import { DiscussionboardSuperadminContent_flagsModeration_queuesAssignmentsController } from "./controllers/discussionBoard/superAdmin/content-flags/moderation-queues/assignments/DiscussionboardSuperadminContent_flagsModeration_queuesAssignmentsController";
import { DiscussionboardSuperadminContent_flagsModeration_queuesEscalationsController } from "./controllers/discussionBoard/superAdmin/content-flags/moderation-queues/escalations/DiscussionboardSuperadminContent_flagsModeration_queuesEscalationsController";
import { DiscussionboardSuperadminContent_moderation_logsController } from "./controllers/discussionBoard/superAdmin/content-moderation-logs/DiscussionboardSuperadminContent_moderation_logsController";
import { DiscussionboardSuperadminDashboardController } from "./controllers/discussionBoard/superAdmin/dashboard/DiscussionboardSuperadminDashboardController";
import { DiscussionboardSuperadminDashboardAppealController } from "./controllers/discussionBoard/superAdmin/dashboard/appeal/DiscussionboardSuperadminDashboardAppealController";
import { DiscussionboardSuperadminData_retention_policiesController } from "./controllers/discussionBoard/superAdmin/data-retention-policies/DiscussionboardSuperadminData_retention_policiesController";
import { DiscussionboardSuperadminData_retention_policiesComplianceController } from "./controllers/discussionBoard/superAdmin/data-retention-policies/compliance/DiscussionboardSuperadminData_retention_policiesComplianceController";
import { DiscussionboardSuperadminError_logsController } from "./controllers/discussionBoard/superAdmin/error-logs/DiscussionboardSuperadminError_logsController";
import { DiscussionboardSuperadminError_logsAnalyticsController } from "./controllers/discussionBoard/superAdmin/error-logs/analytics/DiscussionboardSuperadminError_logsAnalyticsController";
import { DiscussionboardSuperadminMaintenance_schedulesController } from "./controllers/discussionBoard/superAdmin/maintenance-schedules/DiscussionboardSuperadminMaintenance_schedulesController";
import { DiscussionboardSuperadminModerated_content_historiesController } from "./controllers/discussionBoard/superAdmin/moderated-content-histories/DiscussionboardSuperadminModerated_content_historiesController";
import { DiscussionboardSuperadminModeration_action_typesController } from "./controllers/discussionBoard/superAdmin/moderation-action-types/DiscussionboardSuperadminModeration_action_typesController";
import { DiscussionboardSuperadminModeration_logsController } from "./controllers/discussionBoard/superAdmin/moderation-logs/DiscussionboardSuperadminModeration_logsController";
import { DiscussionboardSuperadminModeration_queueController } from "./controllers/discussionBoard/superAdmin/moderation-queue/DiscussionboardSuperadminModeration_queueController";
import { DiscussionboardSuperadminModeration_queuesAssignmentsController } from "./controllers/discussionBoard/superAdmin/moderation-queues/assignments/DiscussionboardSuperadminModeration_queuesAssignmentsController";
import { DiscussionboardSuperadminOrdersController } from "./controllers/discussionBoard/superAdmin/orders/DiscussionboardSuperadminOrdersController";
import { DiscussionboardSuperadminPerformance_metricsController } from "./controllers/discussionBoard/superAdmin/performance-metrics/DiscussionboardSuperadminPerformance_metricsController";
import { DiscussionboardSuperadminPerformance_metricsAnalyticsController } from "./controllers/discussionBoard/superAdmin/performance-metrics/analytics/DiscussionboardSuperadminPerformance_metricsAnalyticsController";
import { DiscussionboardSuperadminPromotion_approvalsController } from "./controllers/discussionBoard/superAdmin/promotion-approvals/DiscussionboardSuperadminPromotion_approvalsController";
import { DiscussionboardSuperadminPromotion_requestsController } from "./controllers/discussionBoard/superAdmin/promotion-requests/DiscussionboardSuperadminPromotion_requestsController";
import { DiscussionboardSuperadminSectionsController } from "./controllers/discussionBoard/superAdmin/sections/DiscussionboardSuperadminSectionsController";
import { DiscussionboardSuperadminSectionsArchivesController } from "./controllers/discussionBoard/superAdmin/sections/archives/DiscussionboardSuperadminSectionsArchivesController";
import { DiscussionboardSuperadminSectionsAssignmentsController } from "./controllers/discussionBoard/superAdmin/sections/assignments/DiscussionboardSuperadminSectionsAssignmentsController";
import { DiscussionboardSuperadminSectionsFilesController } from "./controllers/discussionBoard/superAdmin/sections/files/DiscussionboardSuperadminSectionsFilesController";
import { DiscussionboardSuperadminSectionsImagesController } from "./controllers/discussionBoard/superAdmin/sections/images/DiscussionboardSuperadminSectionsImagesController";
import { DiscussionboardSuperadminSectionsSnapshotsController } from "./controllers/discussionBoard/superAdmin/sections/snapshots/DiscussionboardSuperadminSectionsSnapshotsController";
import { DiscussionboardSuperadminSecurity_eventsController } from "./controllers/discussionBoard/superAdmin/security-events/DiscussionboardSuperadminSecurity_eventsController";
import { DiscussionboardSuperadminStatisticsController } from "./controllers/discussionBoard/superAdmin/statistics/DiscussionboardSuperadminStatisticsController";
import { DiscussionboardSuperadminSystem_activitiesController } from "./controllers/discussionBoard/superAdmin/system-activities/DiscussionboardSuperadminSystem_activitiesController";
import { DiscussionboardSuperadminSystem_configurationsController } from "./controllers/discussionBoard/superAdmin/system-configurations/DiscussionboardSuperadminSystem_configurationsController";
import { DiscussionboardSuperadminSystem_configurationsValidationsController } from "./controllers/discussionBoard/superAdmin/system-configurations/validations/DiscussionboardSuperadminSystem_configurationsValidationsController";
import { DiscussionboardSuperadminSystemHealthController } from "./controllers/discussionBoard/superAdmin/system/health/DiscussionboardSuperadminSystemHealthController";
import { DiscussionboardSuperadminUsersStatisticsController } from "./controllers/discussionBoard/superAdmin/users/statistics/DiscussionboardSuperadminUsersStatisticsController";
import { DiscussionboardUserArticle_draftsController } from "./controllers/discussionBoard/user/article-drafts/DiscussionboardUserArticle_draftsController";
import { DiscussionboardUserArticle_favoritesController } from "./controllers/discussionBoard/user/article-favorites/DiscussionboardUserArticle_favoritesController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardUserArticlesCommentsController } from "./controllers/discussionBoard/user/articles/comments/DiscussionboardUserArticlesCommentsController";
import { DiscussionboardUserArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/user/articles/comments/attachments/DiscussionboardUserArticlesCommentsAttachmentsController";
import { DiscussionboardUserArticlesCommentsFlagsController } from "./controllers/discussionBoard/user/articles/comments/flags/DiscussionboardUserArticlesCommentsFlagsController";
import { DiscussionboardUserArticlesCommentsMentionsController } from "./controllers/discussionBoard/user/articles/comments/mentions/DiscussionboardUserArticlesCommentsMentionsController";
import { DiscussionboardUserArticlesCommentsReportsController } from "./controllers/discussionBoard/user/articles/comments/reports/DiscussionboardUserArticlesCommentsReportsController";
import { DiscussionboardUserArticlesCommentsVotesController } from "./controllers/discussionBoard/user/articles/comments/votes/DiscussionboardUserArticlesCommentsVotesController";
import { DiscussionboardUserArticlesFilesController } from "./controllers/discussionBoard/user/articles/files/DiscussionboardUserArticlesFilesController";
import { DiscussionboardUserArticlesImagesController } from "./controllers/discussionBoard/user/articles/images/DiscussionboardUserArticlesImagesController";
import { DiscussionboardUserArticlesTagsController } from "./controllers/discussionBoard/user/articles/tags/DiscussionboardUserArticlesTagsController";
import { DiscussionboardUserBan_recordsAppealsController } from "./controllers/discussionBoard/user/ban-records/appeals/DiscussionboardUserBan_recordsAppealsController";
import { DiscussionboardUserCommentsEdit_historiesController } from "./controllers/discussionBoard/user/comments/edit-histories/DiscussionboardUserCommentsEdit_historiesController";
import { DiscussionboardUserCommentsReportsController } from "./controllers/discussionBoard/user/comments/reports/DiscussionboardUserCommentsReportsController";
import { DiscussionboardUserContent_flagsController } from "./controllers/discussionBoard/user/content-flags/DiscussionboardUserContent_flagsController";
import { DiscussionboardUserDashboardController } from "./controllers/discussionBoard/user/dashboard/DiscussionboardUserDashboardController";
import { DiscussionboardUserEmail_verificationsController } from "./controllers/discussionBoard/user/email-verifications/DiscussionboardUserEmail_verificationsController";
import { DiscussionboardUserPassword_resetsController } from "./controllers/discussionBoard/user/password-resets/DiscussionboardUserPassword_resetsController";
import { DiscussionboardUserPreferencesController } from "./controllers/discussionBoard/user/preferences/DiscussionboardUserPreferencesController";
import { DiscussionboardUserProfileController } from "./controllers/discussionBoard/user/profile/DiscussionboardUserProfileController";
import { DiscussionboardUserPromotion_requestsController } from "./controllers/discussionBoard/user/promotion-requests/DiscussionboardUserPromotion_requestsController";
import { DiscussionboardUserController } from "./controllers/discussionBoard/user/search/DiscussionboardUserController";
import { DiscussionboardUserSectionsPreferencesController } from "./controllers/discussionBoard/user/sections/preferences/DiscussionboardUserSectionsPreferencesController";
import { DiscussionboardUserSessionsController } from "./controllers/discussionBoard/user/sessions/DiscussionboardUserSessionsController";
import { DiscussionboardUserStatisticsController } from "./controllers/discussionBoard/user/statistics/DiscussionboardUserStatisticsController";
import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";

@Module({
  controllers: [
    DiscussionboardAuthUserController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuperadminController,
    DiscussionboardUsersController,
    DiscussionboardUserProfileController,
    DiscussionboardUserSessionsController,
    DiscussionboardUserPassword_resetsController,
    DiscussionboardUserEmail_verificationsController,
    DiscussionboardAdminsController,
    DiscussionboardSuper_adminsController,
    DiscussionboardAdminSystem_configurationsController,
    DiscussionboardSuperadminSystem_configurationsController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardSuperadminAudit_logsController,
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
    DiscussionboardAdminPromotion_approvalsController,
    DiscussionboardSuperadminPromotion_approvalsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardSuperadminSectionsController,
    DiscussionboardAdminSectionsSnapshotsController,
    DiscussionboardSuperadminSectionsSnapshotsController,
    DiscussionboardSectionsStatisticsController,
    DiscussionboardAdminSectionsAssignmentsController,
    DiscussionboardSuperadminSectionsAssignmentsController,
    DiscussionboardUserSectionsPreferencesController,
    DiscussionboardAdminSectionsFilesController,
    DiscussionboardSuperadminSectionsFilesController,
    DiscussionboardAdminSectionsImagesController,
    DiscussionboardSuperadminSectionsImagesController,
    DiscussionboardAdminSectionsArchivesController,
    DiscussionboardSuperadminSectionsArchivesController,
    DiscussionboardUserArticle_draftsController,
    DiscussionboardUserArticle_favoritesController,
    DiscussionboardUserArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardArticlesController,
    DiscussionboardArticlesFilesController,
    DiscussionboardUserArticlesFilesController,
    DiscussionboardArticlesImagesController,
    DiscussionboardUserArticlesImagesController,
    DiscussionboardArticlesTagsController,
    DiscussionboardUserArticlesTagsController,
    DiscussionboardArticlesView_statsController,
    DiscussionboardArticlesView_stat_eventsController,
    DiscussionboardArticlesSnapshotsController,
    DiscussionboardArticlesImagesFilesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardUserArticlesCommentsController,
    DiscussionboardArticlesCommentsAttachmentsController,
    DiscussionboardUserArticlesCommentsAttachmentsController,
    DiscussionboardArticlesCommentsVotesController,
    DiscussionboardUserArticlesCommentsVotesController,
    DiscussionboardAdminArticlesCommentsReportsController,
    DiscussionboardSuperadminArticlesCommentsReportsController,
    DiscussionboardUserArticlesCommentsReportsController,
    DiscussionboardAdminArticlesCommentsFlagsController,
    DiscussionboardSuperadminArticlesCommentsFlagsController,
    DiscussionboardUserArticlesCommentsFlagsController,
    DiscussionboardArticlesCommentsMentionsController,
    DiscussionboardUserArticlesCommentsMentionsController,
    DiscussionboardArticlesCommentsEdit_historiesController,
    DiscussionboardArticlesCommentsSnapshotsController,
    DiscussionboardAdminArticlesCommentsModerationsController,
    DiscussionboardSuperadminArticlesCommentsModerationsController,
    DiscussionboardArticlesComment_pagination_settingsController,
    DiscussionboardAdminArticlesComment_pagination_settingsController,
    DiscussionboardSuperadminArticlesComment_pagination_settingsController,
    DiscussionboardAdminComment_rate_limitsController,
    DiscussionboardSuperadminComment_rate_limitsController,
    DiscussionboardUserCommentsEdit_historiesController,
    DiscussionboardAdminCommentsModerationsController,
    DiscussionboardSuperadminCommentsModerationsController,
    DiscussionboardUserCommentsReportsController,
    DiscussionboardAdminPromotion_requestsController,
    DiscussionboardSuperadminPromotion_requestsController,
    DiscussionboardUserPromotion_requestsController,
    DiscussionboardAdminAdministratorsController,
    DiscussionboardSuperadminAdministratorsController,
    DiscussionboardAdminBansController,
    DiscussionboardSuperadminBansController,
    DiscussionboardAdminAdministratorsCapabilitiesController,
    DiscussionboardSuperadminAdministratorsCapabilitiesController,
    DiscussionboardAdminAdministratorsGrade_changesController,
    DiscussionboardSuperadminAdministratorsGrade_changesController,
    DiscussionboardAdminBansAppealsController,
    DiscussionboardSuperadminBansAppealsController,
    DiscussionboardBansAppealsController,
    DiscussionboardAdminBan_recordsController,
    DiscussionboardSuperadminBan_recordsController,
    DiscussionboardAdminModeration_logsController,
    DiscussionboardSuperadminModeration_logsController,
    DiscussionboardAdminContent_flagsModeration_queuesController,
    DiscussionboardSuperadminContent_flagsModeration_queuesController,
    DiscussionboardAdminModerated_content_historiesController,
    DiscussionboardSuperadminModerated_content_historiesController,
    DiscussionboardSuperadminAdministrator_grade_changesController,
    DiscussionboardAdminBan_reason_categoriesController,
    DiscussionboardSuperadminBan_reason_categoriesController,
    DiscussionboardAdminBan_recordsAppealsController,
    DiscussionboardSuperadminBan_recordsAppealsController,
    DiscussionboardUserBan_recordsAppealsController,
    DiscussionboardAdminBan_durationsController,
    DiscussionboardSuperadminBan_durationsController,
    DiscussionboardAdminContent_flagsController,
    DiscussionboardSuperadminContent_flagsController,
    DiscussionboardUserContent_flagsController,
    DiscussionboardAdminModeration_action_typesController,
    DiscussionboardSuperadminModeration_action_typesController,
    DiscussionboardAdminContent_flagsModeration_queuesAssignmentsController,
    DiscussionboardSuperadminContent_flagsModeration_queuesAssignmentsController,
    DiscussionboardAdminContent_flagsModeration_queuesEscalationsController,
    DiscussionboardSuperadminContent_flagsModeration_queuesEscalationsController,
    DiscussionboardAdminUsersStatisticsController,
    DiscussionboardSuperadminUsersStatisticsController,
    DiscussionboardAdminAdministratorsDashboardController,
    DiscussionboardSuperadminAdministratorsDashboardController,
    DiscussionboardAdminSystem_configurationsValidationsController,
    DiscussionboardSuperadminSystem_configurationsValidationsController,
    DiscussionboardAdminSystemHealthController,
    DiscussionboardSuperadminSystemHealthController,
    DiscussionboardAdminPerformance_metricsAnalyticsController,
    DiscussionboardSuperadminPerformance_metricsAnalyticsController,
    DiscussionboardAdminError_logsAnalyticsController,
    DiscussionboardSuperadminError_logsAnalyticsController,
    DiscussionboardSuperadminBackup_recordsOperationsController,
    DiscussionboardSuperadminData_retention_policiesComplianceController,
    DiscussionboardUserStatisticsController,
    DiscussionboardAdminStatisticsController,
    DiscussionboardSuperadminStatisticsController,
    DiscussionboardAdminOrdersController,
    DiscussionboardSuperadminOrdersController,
    DiscussionboardUserPreferencesController,
    DiscussionboardAdminAnalyticsController,
    DiscussionboardSuperadminAnalyticsController,
    DiscussionboardUserController,
    DiscussionboardUserDashboardController,
    DiscussionboardAdminDashboardController,
    DiscussionboardSuperadminDashboardController,
    DiscussionboardAdminModeration_queueController,
    DiscussionboardSuperadminModeration_queueController,
    DiscussionboardSuperadminController,
    DiscussionboardSuperadminCapabilitiesController,
    DiscussionboardAdminAppealsController,
    DiscussionboardAdminController,
    DiscussionboardAdminAnalyticsBansController,
    DiscussionboardSuperadminAnalyticsBansController,
    DiscussionboardAdminModeration_queuesAssignmentsController,
    DiscussionboardSuperadminModeration_queuesAssignmentsController,
    DiscussionboardAdminAnalyticsFlagsController,
    DiscussionboardSuperadminAnalyticsFlagsController,
    DiscussionboardAdminDashboardAppealController,
    DiscussionboardSuperadminDashboardAppealController,
    DiscussionboardAdminAnalyticsModeration_efficiencyController,
    DiscussionboardSuperadminAnalyticsModeration_efficiencyController,
    DiscussionboardAdminAnalyticsBan_durationsController,
    DiscussionboardSuperadminAnalyticsBan_durationsController,
    DiscussionboardAdminAnalyticsModeration_action_typesController,
    DiscussionboardSuperadminAnalyticsModeration_action_typesController,
  ],
})
export class MyModule {}
