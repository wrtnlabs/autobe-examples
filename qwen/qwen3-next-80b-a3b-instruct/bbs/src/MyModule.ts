import { Module } from "@nestjs/common";

import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AdminArticlesStatusController } from "./controllers/admin/articles/status/AdminArticlesStatusController";
import { DiscussionboardConfigurationsController } from "./controllers/discussionBoard/configurations/DiscussionboardConfigurationsController";
import { DiscussionboardModeratorConfigurationsController } from "./controllers/discussionBoard/moderator/configurations/DiscussionboardModeratorConfigurationsController";
import { DiscussionboardCitizenChannelsController } from "./controllers/discussionBoard/citizen/channels/DiscussionboardCitizenChannelsController";
import { DiscussionboardChannelsController } from "./controllers/discussionBoard/channels/DiscussionboardChannelsController";
import { DiscussionboardModeratorChannelsController } from "./controllers/discussionBoard/moderator/channels/DiscussionboardModeratorChannelsController";
import { DiscussionboardCitizenAttachmentsController } from "./controllers/discussionBoard/citizen/attachments/DiscussionboardCitizenAttachmentsController";
import { DiscussionboardAttachmentsController } from "./controllers/discussionBoard/attachments/DiscussionboardAttachmentsController";
import { DiscussionboardModeratorAttachmentsController } from "./controllers/discussionBoard/moderator/attachments/DiscussionboardModeratorAttachmentsController";
import { DiscussionboardModeratorModeration_logsController } from "./controllers/discussionBoard/moderator/moderation-logs/DiscussionboardModeratorModeration_logsController";
import { DiscussionboardPostsController } from "./controllers/discussionBoard/posts/DiscussionboardPostsController";
import { DiscussionboardCitizenPostsController } from "./controllers/discussionBoard/citizen/posts/DiscussionboardCitizenPostsController";
import { DiscussionboardModeratorPostsController } from "./controllers/discussionBoard/moderator/posts/DiscussionboardModeratorPostsController";
import { DiscussionboardModeratorAuthentication_logsController } from "./controllers/discussionBoard/moderator/authentication-logs/DiscussionboardModeratorAuthentication_logsController";
import { DiscussionboardAuthentication_logsController } from "./controllers/discussionBoard/authentication-logs/DiscussionboardAuthentication_logsController";
import { DiscussionboardCitizenAuthentication_logsController } from "./controllers/discussionBoard/citizen/authentication-logs/DiscussionboardCitizenAuthentication_logsController";
import { DiscussionboardCitizenUsersController } from "./controllers/discussionBoard/citizen/users/DiscussionboardCitizenUsersController";
import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";
import { DiscussionboardModeratorUsersController } from "./controllers/discussionBoard/moderator/users/DiscussionboardModeratorUsersController";
import { DiscussionboardCitizenArchivesController } from "./controllers/discussionBoard/citizen/archives/DiscussionboardCitizenArchivesController";
import { DiscussionboardModeratorArchivesController } from "./controllers/discussionBoard/moderator/archives/DiscussionboardModeratorArchivesController";
import { DiscussionboardCitizenActivity_logsController } from "./controllers/discussionBoard/citizen/activity-logs/DiscussionboardCitizenActivity_logsController";
import { DiscussionboardModeratorActivity_logsController } from "./controllers/discussionBoard/moderator/activity-logs/DiscussionboardModeratorActivity_logsController";
import { DiscussionboardModeratorStatus_logsController } from "./controllers/discussionBoard/moderator/status-logs/DiscussionboardModeratorStatus_logsController";
import { DiscussionboardStatus_logsController } from "./controllers/discussionBoard/status-logs/DiscussionboardStatus_logsController";
import { DiscussionboardThumbnailsController } from "./controllers/discussionBoard/thumbnails/DiscussionboardThumbnailsController";
import { DiscussionboardCitizenThumbnailsController } from "./controllers/discussionBoard/citizen/thumbnails/DiscussionboardCitizenThumbnailsController";
import { DiscussionboardModeratorThumbnailsController } from "./controllers/discussionBoard/moderator/thumbnails/DiscussionboardModeratorThumbnailsController";
import { DiscussionboardCitizensController } from "./controllers/discussionBoard/citizens/DiscussionboardCitizensController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardCitizenCitizensController } from "./controllers/discussionBoard/citizen/citizens/DiscussionboardCitizenCitizensController";
import { DiscussionboardModeratorCitizensController } from "./controllers/discussionBoard/moderator/citizens/DiscussionboardModeratorCitizensController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardCitizenArticlesController } from "./controllers/discussionBoard/citizen/articles/DiscussionboardCitizenArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardCitizenArticlesImagesController } from "./controllers/discussionBoard/citizen/articles/images/DiscussionboardCitizenArticlesImagesController";
import { DiscussionboardModeratorArticlesImagesController } from "./controllers/discussionBoard/moderator/articles/images/DiscussionboardModeratorArticlesImagesController";
import { DiscussionboardCitizenArticlesFilesController } from "./controllers/discussionBoard/citizen/articles/files/DiscussionboardCitizenArticlesFilesController";
import { DiscussionboardModeratorArticlesFilesController } from "./controllers/discussionBoard/moderator/articles/files/DiscussionboardModeratorArticlesFilesController";
import { DiscussionboardCitizenArticlesReportsController } from "./controllers/discussionBoard/citizen/articles/reports/DiscussionboardCitizenArticlesReportsController";
import { DiscussionboardCitizenArticlesCommentsController } from "./controllers/discussionBoard/citizen/articles/comments/DiscussionboardCitizenArticlesCommentsController";
import { DiscussionboardCitizenArticlesPublication_logsController } from "./controllers/discussionBoard/citizen/articles/publication-logs/DiscussionboardCitizenArticlesPublication_logsController";
import { DiscussionboardModeratorArticlesPublication_logsController } from "./controllers/discussionBoard/moderator/articles/publication-logs/DiscussionboardModeratorArticlesPublication_logsController";
import { DiscussionboardModeratorArticlesReportsController } from "./controllers/discussionBoard/moderator/articles/reports/DiscussionboardModeratorArticlesReportsController";
import { DiscussionboardArticlesReportsController } from "./controllers/discussionBoard/articles/reports/DiscussionboardArticlesReportsController";
import { DiscussionboardCitizenArticlesStatus_logsController } from "./controllers/discussionBoard/citizen/articles/status-logs/DiscussionboardCitizenArticlesStatus_logsController";
import { DiscussionboardModeratorArticlesStatus_logsController } from "./controllers/discussionBoard/moderator/articles/status-logs/DiscussionboardModeratorArticlesStatus_logsController";
import { DiscussionboardArticlesStatus_logsController } from "./controllers/discussionBoard/articles/status-logs/DiscussionboardArticlesStatus_logsController";
import { DiscussionboardArticlesStatusesController } from "./controllers/discussionBoard/articles/statuses/DiscussionboardArticlesStatusesController";
import { DiscussionboardArticlesCategoriesController } from "./controllers/discussionBoard/articles/categories/DiscussionboardArticlesCategoriesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesPublication_logsController } from "./controllers/discussionBoard/articles/publication-logs/DiscussionboardArticlesPublication_logsController";
import { DiscussionboardCitizenCommentsController } from "./controllers/discussionBoard/citizen/comments/DiscussionboardCitizenCommentsController";
import { DiscussionboardCommentsRepliesController } from "./controllers/discussionBoard/comments/replies/DiscussionboardCommentsRepliesController";
import { DiscussionboardCitizenCommentsRepliesController } from "./controllers/discussionBoard/citizen/comments/replies/DiscussionboardCitizenCommentsRepliesController";
import { DiscussionboardModeratorCommentsRepliesController } from "./controllers/discussionBoard/moderator/comments/replies/DiscussionboardModeratorCommentsRepliesController";
import { DiscussionboardCitizenCommentsReportsController } from "./controllers/discussionBoard/citizen/comments/reports/DiscussionboardCitizenCommentsReportsController";
import { DiscussionboardModeratorCommentsReportsController } from "./controllers/discussionBoard/moderator/comments/reports/DiscussionboardModeratorCommentsReportsController";
import { DiscussionboardCommentsVotesController } from "./controllers/discussionBoard/comments/votes/DiscussionboardCommentsVotesController";
import { DiscussionboardCitizenCommentsVotesController } from "./controllers/discussionBoard/citizen/comments/votes/DiscussionboardCitizenCommentsVotesController";
import { DiscussionboardModeratorCommentsMod_actionsController } from "./controllers/discussionBoard/moderator/comments/mod-actions/DiscussionboardModeratorCommentsMod_actionsController";
import { DiscussionboardCitizenCommentsNotificationsController } from "./controllers/discussionBoard/citizen/comments/notifications/DiscussionboardCitizenCommentsNotificationsController";
import { DiscussionboardModeratorCommentsNotificationsController } from "./controllers/discussionBoard/moderator/comments/notifications/DiscussionboardModeratorCommentsNotificationsController";
import { DiscussionboardCitizenImagesController } from "./controllers/discussionBoard/citizen/images/DiscussionboardCitizenImagesController";
import { DiscussionboardImagesController } from "./controllers/discussionBoard/images/DiscussionboardImagesController";
import { DiscussionboardCitizenFilesController } from "./controllers/discussionBoard/citizen/files/DiscussionboardCitizenFilesController";
import { DiscussionboardModeratorFilesController } from "./controllers/discussionBoard/moderator/files/DiscussionboardModeratorFilesController";
import { DiscussionboardFilesController } from "./controllers/discussionBoard/files/DiscussionboardFilesController";
import { DiscussionboardModeratorImagesController } from "./controllers/discussionBoard/moderator/images/DiscussionboardModeratorImagesController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardModeratorModerationActionsController } from "./controllers/discussionBoard/moderator/moderation/actions/DiscussionboardModeratorModerationActionsController";
import { DiscussionboardCitizenWarningsController } from "./controllers/discussionBoard/citizen/warnings/DiscussionboardCitizenWarningsController";
import { DiscussionboardModeratorWarningsController } from "./controllers/discussionBoard/moderator/warnings/DiscussionboardModeratorWarningsController";
import { DiscussionboardModeratorSuspensionsController } from "./controllers/discussionBoard/moderator/suspensions/DiscussionboardModeratorSuspensionsController";
import { DiscussionboardModeratorBansController } from "./controllers/discussionBoard/moderator/bans/DiscussionboardModeratorBansController";
import { DiscussionboardModeratorAppealsController } from "./controllers/discussionBoard/moderator/appeals/DiscussionboardModeratorAppealsController";
import { DiscussionboardWarningsController } from "./controllers/discussionBoard/warnings/DiscussionboardWarningsController";
import { DiscussionboardAppealsController } from "./controllers/discussionBoard/appeals/DiscussionboardAppealsController";
import { DiscussionboardModeratorModerationLogsController } from "./controllers/discussionBoard/moderator/moderation/logs/DiscussionboardModeratorModerationLogsController";
import { DiscussionboardCitizenModerationAudit_trailsController } from "./controllers/discussionBoard/citizen/moderation/audit-trails/DiscussionboardCitizenModerationAudit_trailsController";
import { DiscussionboardModeratorModerationAudit_trailsController } from "./controllers/discussionBoard/moderator/moderation/audit-trails/DiscussionboardModeratorModerationAudit_trailsController";
import { DiscussionboardCitizenReportsController } from "./controllers/discussionBoard/citizen/reports/DiscussionboardCitizenReportsController";
import { DiscussionboardCitizenSuspensionsController } from "./controllers/discussionBoard/citizen/suspensions/DiscussionboardCitizenSuspensionsController";
import { DiscussionboardCitizenBansController } from "./controllers/discussionBoard/citizen/bans/DiscussionboardCitizenBansController";
import { DiscussionboardCitizenAppealsController } from "./controllers/discussionBoard/citizen/appeals/DiscussionboardCitizenAppealsController";
import { DiscussionboardModeratorReputationCitizen_violationsController } from "./controllers/discussionBoard/moderator/reputation/citizen-violations/DiscussionboardModeratorReputationCitizen_violationsController";
import { DiscussionboardCitizenReputationCitizen_violationsController } from "./controllers/discussionBoard/citizen/reputation/citizen-violations/DiscussionboardCitizenReputationCitizen_violationsController";
import { DiscussionboardCitizenReputationCitizen_trust_scoresController } from "./controllers/discussionBoard/citizen/reputation/citizen-trust-scores/DiscussionboardCitizenReputationCitizen_trust_scoresController";
import { DiscussionboardModeratorReputationCitizen_suspensionsController } from "./controllers/discussionBoard/moderator/reputation/citizen-suspensions/DiscussionboardModeratorReputationCitizen_suspensionsController";
import { DiscussionboardModeratorReputationModerator_actionsController } from "./controllers/discussionBoard/moderator/reputation/moderator-actions/DiscussionboardModeratorReputationModerator_actionsController";
import { DiscussionboardCitizenReputationReport_aggregationsController } from "./controllers/discussionBoard/citizen/reputation/report-aggregations/DiscussionboardCitizenReputationReport_aggregationsController";
import { DiscussionboardModeratorReputationReport_aggregationsController } from "./controllers/discussionBoard/moderator/reputation/report-aggregations/DiscussionboardModeratorReputationReport_aggregationsController";
import { DiscussionboardNotificationsTemplatesController } from "./controllers/discussionBoard/notifications/templates/DiscussionboardNotificationsTemplatesController";
import { DiscussionboardNotificationsDelivery_logsController } from "./controllers/discussionBoard/notifications/delivery-logs/DiscussionboardNotificationsDelivery_logsController";
import { DiscussionboardCitizenNotificationsPreferencesController } from "./controllers/discussionBoard/citizen/notifications/preferences/DiscussionboardCitizenNotificationsPreferencesController";
import { DiscussionboardCitizenNotificationsRead_statusController } from "./controllers/discussionBoard/citizen/notifications/read-status/DiscussionboardCitizenNotificationsRead_statusController";
import { DiscussionboardNotificationsRecordsController } from "./controllers/discussionBoard/notifications/records/DiscussionboardNotificationsRecordsController";
import { DiscussionboardCitizenNotificationsRecordsController } from "./controllers/discussionBoard/citizen/notifications/records/DiscussionboardCitizenNotificationsRecordsController";
import { DiscussionboardModeratorNotificationsRecordsController } from "./controllers/discussionBoard/moderator/notifications/records/DiscussionboardModeratorNotificationsRecordsController";
import { DiscussionboardCitizenNotificationsTemplatesController } from "./controllers/discussionBoard/citizen/notifications/templates/DiscussionboardCitizenNotificationsTemplatesController";
import { DiscussionboardModeratorNotificationsTemplatesController } from "./controllers/discussionBoard/moderator/notifications/templates/DiscussionboardModeratorNotificationsTemplatesController";
import { DiscussionboardModeratorNotificationsDelivery_logsController } from "./controllers/discussionBoard/moderator/notifications/delivery-logs/DiscussionboardModeratorNotificationsDelivery_logsController";
import { DiscussionboardCitizenNotificationsRecordsUnreadController } from "./controllers/discussionBoard/citizen/notifications/records/unread/DiscussionboardCitizenNotificationsRecordsUnreadController";
import { DiscussionboardCitizenNotificationsController } from "./controllers/discussionBoard/citizen/notifications/trigger/DiscussionboardCitizenNotificationsController";
import { DiscussionboardModeratorNotificationsController } from "./controllers/discussionBoard/moderator/notifications/trigger/DiscussionboardModeratorNotificationsController";
import { DiscussionboardModeratorAuditEventsController } from "./controllers/discussionBoard/moderator/audit/events/DiscussionboardModeratorAuditEventsController";
import { DiscussionboardAuditEventsController } from "./controllers/discussionBoard/audit/events/DiscussionboardAuditEventsController";
import { DiscussionboardModeratorAuditCompliance_recordsController } from "./controllers/discussionBoard/moderator/audit/compliance-records/DiscussionboardModeratorAuditCompliance_recordsController";
import { DiscussionboardModeratorAuditSecurityLogsController } from "./controllers/discussionBoard/moderator/audit/security/logs/DiscussionboardModeratorAuditSecurityLogsController";
import { DiscussionboardModeratorAuditOperationalLogsController } from "./controllers/discussionBoard/moderator/audit/operational/logs/DiscussionboardModeratorAuditOperationalLogsController";
import { DiscussionboardModeratorModeration_actionsController } from "./controllers/discussionBoard/moderator/moderation-actions/DiscussionboardModeratorModeration_actionsController";
import { DiscussionboardModeration_actionsController } from "./controllers/discussionBoard/moderation-actions/DiscussionboardModeration_actionsController";
import { DiscussionboardCitizenComment_votesController } from "./controllers/discussionBoard/citizen/comment-votes/DiscussionboardCitizenComment_votesController";
import { DiscussionboardComment_votesController } from "./controllers/discussionBoard/comment-votes/DiscussionboardComment_votesController";
import { DiscussionboardCitizenCitizen_trust_scoresController } from "./controllers/discussionBoard/citizen/citizen-trust-scores/DiscussionboardCitizenCitizen_trust_scoresController";
import { DiscussionboardModeratorCitizen_trust_scoresController } from "./controllers/discussionBoard/moderator/citizen-trust-scores/DiscussionboardModeratorCitizen_trust_scoresController";
import { DiscussionboardModeratorCitizen_suspensionsController } from "./controllers/discussionBoard/moderator/citizen-suspensions/DiscussionboardModeratorCitizen_suspensionsController";
import { DiscussionboardCitizenCitizen_suspensionsController } from "./controllers/discussionBoard/citizen/citizen-suspensions/DiscussionboardCitizenCitizen_suspensionsController";
import { DiscussionboardModeratorOperational_logsController } from "./controllers/discussionBoard/moderator/operational-logs/DiscussionboardModeratorOperational_logsController";
import { DiscussionboardOperational_logsController } from "./controllers/discussionBoard/operational-logs/DiscussionboardOperational_logsController";
import { DiscussionboardCitizenCategoriesController } from "./controllers/discussionBoard/citizen/categories/DiscussionboardCitizenCategoriesController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardCitizenCitizensActivationController } from "./controllers/discussionBoard/citizen/citizens/activation/DiscussionboardCitizenCitizensActivationController";
import { DiscussionboardModeratorModeratorsStatusController } from "./controllers/discussionBoard/moderator/moderators/status/DiscussionboardModeratorModeratorsStatusController";
import { DiscussionboardCitizensSessionsValidateController } from "./controllers/discussionBoard/citizens/sessions/validate/DiscussionboardCitizensSessionsValidateController";
import { DiscussionboardModeratorModeratorsSessionsValidateController } from "./controllers/discussionBoard/moderator/moderators/sessions/validate/DiscussionboardModeratorModeratorsSessionsValidateController";
import { DiscussionboardCitizensLogin_historyController } from "./controllers/discussionBoard/citizens/login-history/DiscussionboardCitizensLogin_historyController";
import { DiscussionboardModeratorModeratorsLogin_historyController } from "./controllers/discussionBoard/moderator/moderators/login-history/DiscussionboardModeratorModeratorsLogin_historyController";
import { DiscussionboardAnalyticsArticlesTrendsController } from "./controllers/discussionBoard/analytics/articles/trends/DiscussionboardAnalyticsArticlesTrendsController";
import { DiscussionboardReportsArticlesAggregatedController } from "./controllers/discussionBoard/reports/articles/aggregated/DiscussionboardReportsArticlesAggregatedController";
import { DiscussionboardAnalyticsArticlesChannelsController } from "./controllers/discussionBoard/analytics/articles/channels/DiscussionboardAnalyticsArticlesChannelsController";
import { DiscussionboardCitizenSearchArticlesController } from "./controllers/discussionBoard/citizen/search/articles/DiscussionboardCitizenSearchArticlesController";
import { DiscussionboardModeratorSearchArticlesController } from "./controllers/discussionBoard/moderator/search/articles/DiscussionboardModeratorSearchArticlesController";
import { DiscussionboardModeratorActionsArticlesBulk_statusController } from "./controllers/discussionBoard/moderator/actions/articles/bulk-status/DiscussionboardModeratorActionsArticlesBulk_statusController";
import { DiscussionboardModeratorAnalyticsArticlesStatus_changesController } from "./controllers/discussionBoard/moderator/analytics/articles/status-changes/DiscussionboardModeratorAnalyticsArticlesStatus_changesController";
import { DiscussionboardAnalyticsCommentsMetricsController } from "./controllers/discussionBoard/analytics/comments/metrics/DiscussionboardAnalyticsCommentsMetricsController";
import { DiscussionboardDashboardCommentsController } from "./controllers/discussionBoard/dashboard/comments/overview/DiscussionboardDashboardCommentsController";
import { DiscussionboardSearchCommentsController } from "./controllers/discussionBoard/search/comments/DiscussionboardSearchCommentsController";
import { DiscussionboardModeratorReportsCommentsFullController } from "./controllers/discussionBoard/moderator/reports/comments/full/DiscussionboardModeratorReportsCommentsFullController";
import { DiscussionboardModeratorModerationCommentsFlagsController } from "./controllers/discussionBoard/moderator/moderation/comments/flags/DiscussionboardModeratorModerationCommentsFlagsController";
import { DiscussionboardCommentsRepliesCountController } from "./controllers/discussionBoard/comments/replies/count/DiscussionboardCommentsRepliesCountController";
import { DiscussionboardModeratorModerationWarningsController } from "./controllers/discussionBoard/moderator/moderation/warnings/DiscussionboardModeratorModerationWarningsController";
import { DiscussionboardModeratorModerationSuspensionsController } from "./controllers/discussionBoard/moderator/moderation/suspensions/DiscussionboardModeratorModerationSuspensionsController";
import { DiscussionboardModeratorModerationBansController } from "./controllers/discussionBoard/moderator/moderation/bans/DiscussionboardModeratorModerationBansController";
import { DiscussionboardCitizenModerationAppealsController } from "./controllers/discussionBoard/citizen/moderation/appeals/DiscussionboardCitizenModerationAppealsController";
import { DiscussionboardCitizenModerationReportController } from "./controllers/discussionBoard/citizen/moderation/report/DiscussionboardCitizenModerationReportController";
import { DiscussionboardModeratorModerationReview_queuesController } from "./controllers/discussionBoard/moderator/moderation/review-queues/DiscussionboardModeratorModerationReview_queuesController";
import { DiscussionboardModeratorModerationAnalyticsController } from "./controllers/discussionBoard/moderator/moderation/analytics/DiscussionboardModeratorModerationAnalyticsController";
import { DiscussionboardCitizenReputationCitizensMetricsController } from "./controllers/discussionBoard/citizen/reputation/citizens/metrics/DiscussionboardCitizenReputationCitizensMetricsController";
import { DiscussionboardModeratorReputationModeratorsEffectivenessController } from "./controllers/discussionBoard/moderator/reputation/moderators/effectiveness/DiscussionboardModeratorReputationModeratorsEffectivenessController";
import { DiscussionboardModeratorReputationReportsAnalysisController } from "./controllers/discussionBoard/moderator/reputation/reports/analysis/DiscussionboardModeratorReputationReportsAnalysisController";
import { DiscussionboardModeratorReputationModerationThresholdsController } from "./controllers/discussionBoard/moderator/reputation/moderation/thresholds/DiscussionboardModeratorReputationModerationThresholdsController";
import { DiscussionboardDashboardUsersNotification_preferencesController } from "./controllers/discussionBoard/dashboard/users/notification-preferences/DiscussionboardDashboardUsersNotification_preferencesController";
import { DiscussionboardCitizenNotificationsUserUnreadController } from "./controllers/discussionBoard/citizen/notifications/user/unread/DiscussionboardCitizenNotificationsUserUnreadController";
import { DiscussionboardModeratorAnalyticsNotificationsDeliveryController } from "./controllers/discussionBoard/moderator/analytics/notifications/delivery/DiscussionboardModeratorAnalyticsNotificationsDeliveryController";
import { DiscussionboardCitizenReportsNotificationsActivityController } from "./controllers/discussionBoard/citizen/reports/notifications/activity/DiscussionboardCitizenReportsNotificationsActivityController";
import { DiscussionboardModeratorReportsNotificationsActivityController } from "./controllers/discussionBoard/moderator/reports/notifications/activity/DiscussionboardModeratorReportsNotificationsActivityController";
import { DiscussionboardModeratorNotificationsPreferencesBulkController } from "./controllers/discussionBoard/moderator/notifications/preferences/bulk/DiscussionboardModeratorNotificationsPreferencesBulkController";
import { DiscussionboardAuditComplianceReportsController } from "./controllers/discussionBoard/audit/compliance/reports/DiscussionboardAuditComplianceReportsController";
import { DiscussionboardAuditOperationalLogsController } from "./controllers/discussionBoard/audit/operational/logs/DiscussionboardAuditOperationalLogsController";
import { DiscussionboardModeratorDashboardsAdminOverviewController } from "./controllers/discussionBoard/moderator/dashboards/admin/overview/DiscussionboardModeratorDashboardsAdminOverviewController";
import { DiscussionboardModeratorDashboardsReportsUnresolvedController } from "./controllers/discussionBoard/moderator/dashboards/reports/unresolved/DiscussionboardModeratorDashboardsReportsUnresolvedController";
import { DiscussionboardModeratorDashboardsModerationSummaryController } from "./controllers/discussionBoard/moderator/dashboards/moderation/summary/DiscussionboardModeratorDashboardsModerationSummaryController";
import { DiscussionboardModeratorDashboardsActivityMonitorController } from "./controllers/discussionBoard/moderator/dashboards/activity/monitor/DiscussionboardModeratorDashboardsActivityMonitorController";
import { DiscussionboardSearchGlobalController } from "./controllers/discussionBoard/search/global/DiscussionboardSearchGlobalController";

@Module({
  controllers: [
    AuthMemberController,
    AuthAdminController,
    AdminArticlesStatusController,
    DiscussionboardConfigurationsController,
    DiscussionboardModeratorConfigurationsController,
    DiscussionboardCitizenChannelsController,
    DiscussionboardChannelsController,
    DiscussionboardModeratorChannelsController,
    DiscussionboardCitizenAttachmentsController,
    DiscussionboardAttachmentsController,
    DiscussionboardModeratorAttachmentsController,
    DiscussionboardModeratorModeration_logsController,
    DiscussionboardPostsController,
    DiscussionboardCitizenPostsController,
    DiscussionboardModeratorPostsController,
    DiscussionboardModeratorAuthentication_logsController,
    DiscussionboardAuthentication_logsController,
    DiscussionboardCitizenAuthentication_logsController,
    DiscussionboardCitizenUsersController,
    DiscussionboardUsersController,
    DiscussionboardModeratorUsersController,
    DiscussionboardCitizenArchivesController,
    DiscussionboardModeratorArchivesController,
    DiscussionboardCitizenActivity_logsController,
    DiscussionboardModeratorActivity_logsController,
    DiscussionboardModeratorStatus_logsController,
    DiscussionboardStatus_logsController,
    DiscussionboardThumbnailsController,
    DiscussionboardCitizenThumbnailsController,
    DiscussionboardModeratorThumbnailsController,
    DiscussionboardCitizensController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardCitizenCitizensController,
    DiscussionboardModeratorCitizensController,
    DiscussionboardArticlesController,
    DiscussionboardCitizenArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardCitizenArticlesImagesController,
    DiscussionboardModeratorArticlesImagesController,
    DiscussionboardCitizenArticlesFilesController,
    DiscussionboardModeratorArticlesFilesController,
    DiscussionboardCitizenArticlesReportsController,
    DiscussionboardCitizenArticlesCommentsController,
    DiscussionboardCitizenArticlesPublication_logsController,
    DiscussionboardModeratorArticlesPublication_logsController,
    DiscussionboardModeratorArticlesReportsController,
    DiscussionboardArticlesReportsController,
    DiscussionboardCitizenArticlesStatus_logsController,
    DiscussionboardModeratorArticlesStatus_logsController,
    DiscussionboardArticlesStatus_logsController,
    DiscussionboardArticlesStatusesController,
    DiscussionboardArticlesCategoriesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardArticlesPublication_logsController,
    DiscussionboardCitizenCommentsController,
    DiscussionboardCommentsRepliesController,
    DiscussionboardCitizenCommentsRepliesController,
    DiscussionboardModeratorCommentsRepliesController,
    DiscussionboardCitizenCommentsReportsController,
    DiscussionboardModeratorCommentsReportsController,
    DiscussionboardCommentsVotesController,
    DiscussionboardCitizenCommentsVotesController,
    DiscussionboardModeratorCommentsMod_actionsController,
    DiscussionboardCitizenCommentsNotificationsController,
    DiscussionboardModeratorCommentsNotificationsController,
    DiscussionboardCitizenImagesController,
    DiscussionboardImagesController,
    DiscussionboardCitizenFilesController,
    DiscussionboardModeratorFilesController,
    DiscussionboardFilesController,
    DiscussionboardModeratorImagesController,
    DiscussionboardModeratorReportsController,
    DiscussionboardModeratorModerationActionsController,
    DiscussionboardCitizenWarningsController,
    DiscussionboardModeratorWarningsController,
    DiscussionboardModeratorSuspensionsController,
    DiscussionboardModeratorBansController,
    DiscussionboardModeratorAppealsController,
    DiscussionboardWarningsController,
    DiscussionboardAppealsController,
    DiscussionboardModeratorModerationLogsController,
    DiscussionboardCitizenModerationAudit_trailsController,
    DiscussionboardModeratorModerationAudit_trailsController,
    DiscussionboardCitizenReportsController,
    DiscussionboardCitizenSuspensionsController,
    DiscussionboardCitizenBansController,
    DiscussionboardCitizenAppealsController,
    DiscussionboardModeratorReputationCitizen_violationsController,
    DiscussionboardCitizenReputationCitizen_violationsController,
    DiscussionboardCitizenReputationCitizen_trust_scoresController,
    DiscussionboardModeratorReputationCitizen_suspensionsController,
    DiscussionboardModeratorReputationModerator_actionsController,
    DiscussionboardCitizenReputationReport_aggregationsController,
    DiscussionboardModeratorReputationReport_aggregationsController,
    DiscussionboardNotificationsTemplatesController,
    DiscussionboardNotificationsDelivery_logsController,
    DiscussionboardCitizenNotificationsPreferencesController,
    DiscussionboardCitizenNotificationsRead_statusController,
    DiscussionboardNotificationsRecordsController,
    DiscussionboardCitizenNotificationsRecordsController,
    DiscussionboardModeratorNotificationsRecordsController,
    DiscussionboardCitizenNotificationsTemplatesController,
    DiscussionboardModeratorNotificationsTemplatesController,
    DiscussionboardModeratorNotificationsDelivery_logsController,
    DiscussionboardCitizenNotificationsRecordsUnreadController,
    DiscussionboardCitizenNotificationsController,
    DiscussionboardModeratorNotificationsController,
    DiscussionboardModeratorAuditEventsController,
    DiscussionboardAuditEventsController,
    DiscussionboardModeratorAuditCompliance_recordsController,
    DiscussionboardModeratorAuditSecurityLogsController,
    DiscussionboardModeratorAuditOperationalLogsController,
    DiscussionboardModeratorModeration_actionsController,
    DiscussionboardModeration_actionsController,
    DiscussionboardCitizenComment_votesController,
    DiscussionboardComment_votesController,
    DiscussionboardCitizenCitizen_trust_scoresController,
    DiscussionboardModeratorCitizen_trust_scoresController,
    DiscussionboardModeratorCitizen_suspensionsController,
    DiscussionboardCitizenCitizen_suspensionsController,
    DiscussionboardModeratorOperational_logsController,
    DiscussionboardOperational_logsController,
    DiscussionboardCitizenCategoriesController,
    DiscussionboardCategoriesController,
    DiscussionboardCitizenCitizensActivationController,
    DiscussionboardModeratorModeratorsStatusController,
    DiscussionboardCitizensSessionsValidateController,
    DiscussionboardModeratorModeratorsSessionsValidateController,
    DiscussionboardCitizensLogin_historyController,
    DiscussionboardModeratorModeratorsLogin_historyController,
    DiscussionboardAnalyticsArticlesTrendsController,
    DiscussionboardReportsArticlesAggregatedController,
    DiscussionboardAnalyticsArticlesChannelsController,
    DiscussionboardCitizenSearchArticlesController,
    DiscussionboardModeratorSearchArticlesController,
    DiscussionboardModeratorActionsArticlesBulk_statusController,
    DiscussionboardModeratorAnalyticsArticlesStatus_changesController,
    DiscussionboardAnalyticsCommentsMetricsController,
    DiscussionboardDashboardCommentsController,
    DiscussionboardSearchCommentsController,
    DiscussionboardModeratorReportsCommentsFullController,
    DiscussionboardModeratorModerationCommentsFlagsController,
    DiscussionboardCommentsRepliesCountController,
    DiscussionboardModeratorModerationWarningsController,
    DiscussionboardModeratorModerationSuspensionsController,
    DiscussionboardModeratorModerationBansController,
    DiscussionboardCitizenModerationAppealsController,
    DiscussionboardCitizenModerationReportController,
    DiscussionboardModeratorModerationReview_queuesController,
    DiscussionboardModeratorModerationAnalyticsController,
    DiscussionboardCitizenReputationCitizensMetricsController,
    DiscussionboardModeratorReputationModeratorsEffectivenessController,
    DiscussionboardModeratorReputationReportsAnalysisController,
    DiscussionboardModeratorReputationModerationThresholdsController,
    DiscussionboardDashboardUsersNotification_preferencesController,
    DiscussionboardCitizenNotificationsUserUnreadController,
    DiscussionboardModeratorAnalyticsNotificationsDeliveryController,
    DiscussionboardCitizenReportsNotificationsActivityController,
    DiscussionboardModeratorReportsNotificationsActivityController,
    DiscussionboardModeratorNotificationsPreferencesBulkController,
    DiscussionboardAuditComplianceReportsController,
    DiscussionboardAuditOperationalLogsController,
    DiscussionboardModeratorDashboardsAdminOverviewController,
    DiscussionboardModeratorDashboardsReportsUnresolvedController,
    DiscussionboardModeratorDashboardsModerationSummaryController,
    DiscussionboardModeratorDashboardsActivityMonitorController,
    DiscussionboardSearchGlobalController,
  ],
})
export class MyModule {}
