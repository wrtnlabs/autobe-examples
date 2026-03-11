import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdministrative_historiesController } from "./controllers/discussionBoard/admin/administrative-histories/DiscussionboardAdminAdministrative_historiesController";
import { DiscussionboardAdminAlertsCapacityController } from "./controllers/discussionBoard/admin/alerts/capacity/DiscussionboardAdminAlertsCapacityController";
import { DiscussionboardAdminAnalyticsController } from "./controllers/discussionBoard/admin/analytics/DiscussionboardAdminAnalyticsController";
import { DiscussionboardAdminAnalyticsDownloadsController } from "./controllers/discussionBoard/admin/analytics/downloads/DiscussionboardAdminAnalyticsDownloadsController";
import { DiscussionboardAdminArticlesAttachmentsController } from "./controllers/discussionBoard/admin/articles/attachments/DiscussionboardAdminArticlesAttachmentsController";
import { DiscussionboardAdminArticlesAttachmentsImage_metadataController } from "./controllers/discussionBoard/admin/articles/attachments/image-metadata/DiscussionboardAdminArticlesAttachmentsImage_metadataController";
import { DiscussionboardAdminArticlesCommentsActivitiesController } from "./controllers/discussionBoard/admin/articles/comments/activities/DiscussionboardAdminArticlesCommentsActivitiesController";
import { DiscussionboardAdminArticlesCommentsActivitiesMetadataController } from "./controllers/discussionBoard/admin/articles/comments/activities/metadata/DiscussionboardAdminArticlesCommentsActivitiesMetadataController";
import { DiscussionboardAdminArticlesCommentsDeletionsController } from "./controllers/discussionBoard/admin/articles/comments/deletions/DiscussionboardAdminArticlesCommentsDeletionsController";
import { DiscussionboardAdminArticlesMetricsController } from "./controllers/discussionBoard/admin/articles/metrics/DiscussionboardAdminArticlesMetricsController";
import { DiscussionboardAdminAttachment_categoriesController } from "./controllers/discussionBoard/admin/attachment-categories/DiscussionboardAdminAttachment_categoriesController";
import { DiscussionboardAdminAttachment_category_mappingsController } from "./controllers/discussionBoard/admin/attachment-category-mappings/DiscussionboardAdminAttachment_category_mappingsController";
import { DiscussionboardAdminAttachment_downloadsController } from "./controllers/discussionBoard/admin/attachment-downloads/DiscussionboardAdminAttachment_downloadsController";
import { DiscussionboardAdminAttachment_snapshotsController } from "./controllers/discussionBoard/admin/attachment-snapshots/DiscussionboardAdminAttachment_snapshotsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminBansDashboardController } from "./controllers/discussionBoard/admin/bans/dashboard/DiscussionboardAdminBansDashboardController";
import { DiscussionboardAdminBulkCategorizeController } from "./controllers/discussionBoard/admin/bulk/categorize/DiscussionboardAdminBulkCategorizeController";
import { DiscussionboardAdminCommentsDeletion_impactController } from "./controllers/discussionBoard/admin/comments/deletion-impact/DiscussionboardAdminCommentsDeletion_impactController";
import { DiscussionboardAdminCross_sectionController } from "./controllers/discussionBoard/admin/cross-section/DiscussionboardAdminCross_sectionController";
import { DiscussionboardAdminDashboardCategoriesController } from "./controllers/discussionBoard/admin/dashboard/categories/DiscussionboardAdminDashboardCategoriesController";
import { DiscussionboardAdminDiscoveryController } from "./controllers/discussionBoard/admin/discovery/DiscussionboardAdminDiscoveryController";
import { DiscussionboardAdminDuplicationController } from "./controllers/discussionBoard/admin/duplication/DiscussionboardAdminDuplicationController";
import { DiscussionboardAdminEngagementController } from "./controllers/discussionBoard/admin/engagement/DiscussionboardAdminEngagementController";
import { DiscussionboardAdminHealthController } from "./controllers/discussionBoard/admin/health/DiscussionboardAdminHealthController";
import { DiscussionboardAdminMaintenance_schedulesController } from "./controllers/discussionBoard/admin/maintenance-schedules/DiscussionboardAdminMaintenance_schedulesController";
import { DiscussionboardAdminModerationsMetricsController } from "./controllers/discussionBoard/admin/moderations/metrics/DiscussionboardAdminModerationsMetricsController";
import { DiscussionboardAdminMonitoringAttachment_usageController } from "./controllers/discussionBoard/admin/monitoring/attachment-usage/DiscussionboardAdminMonitoringAttachment_usageController";
import { DiscussionboardAdminPopularController } from "./controllers/discussionBoard/admin/popular/DiscussionboardAdminPopularController";
import { DiscussionboardAdminReactionsAnalyticsController } from "./controllers/discussionBoard/admin/reactions/analytics/DiscussionboardAdminReactionsAnalyticsController";
import { DiscussionboardAdminSearchController } from "./controllers/discussionBoard/admin/search/DiscussionboardAdminSearchController";
import { DiscussionboardAdminSearchAttachmentsController } from "./controllers/discussionBoard/admin/search/attachments/DiscussionboardAdminSearchAttachmentsController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsDeletionsController } from "./controllers/discussionBoard/admin/sections/deletions/DiscussionboardAdminSectionsDeletionsController";
import { DiscussionboardAdminSectionsSnapshotsController } from "./controllers/discussionBoard/admin/sections/snapshots/DiscussionboardAdminSectionsSnapshotsController";
import { DiscussionboardAdminStatus_enumsController } from "./controllers/discussionBoard/admin/status-enums/DiscussionboardAdminStatus_enumsController";
import { DiscussionboardAdminStatus_enumsReferencesController } from "./controllers/discussionBoard/admin/status-enums/references/DiscussionboardAdminStatus_enumsReferencesController";
import { DiscussionboardAdminStatus_enumsSnapshotsController } from "./controllers/discussionBoard/admin/status-enums/snapshots/DiscussionboardAdminStatus_enumsSnapshotsController";
import { DiscussionboardAdminStatus_typesController } from "./controllers/discussionBoard/admin/status-types/DiscussionboardAdminStatus_typesController";
import { DiscussionboardAdminSystem_audit_logsParametersController } from "./controllers/discussionBoard/admin/system-audit-logs/parameters/DiscussionboardAdminSystem_audit_logsParametersController";
import { DiscussionboardAdminSystem_configurationsController } from "./controllers/discussionBoard/admin/system-configurations/DiscussionboardAdminSystem_configurationsController";
import { DiscussionboardAdminSystem_health_metricsMetadataController } from "./controllers/discussionBoard/admin/system-health-metrics/metadata/DiscussionboardAdminSystem_health_metricsMetadataController";
import { DiscussionboardAdminSystem_metadataController } from "./controllers/discussionBoard/admin/system-metadata/DiscussionboardAdminSystem_metadataController";
import { DiscussionboardAdminSystem_notificationsController } from "./controllers/discussionBoard/admin/system-notifications/DiscussionboardAdminSystem_notificationsController";
import { DiscussionboardAdminSystem_notificationsSubtypesController } from "./controllers/discussionBoard/admin/system-notifications/subtypes/DiscussionboardAdminSystem_notificationsSubtypesController";
import { DiscussionboardAdminThumbnailsController } from "./controllers/discussionBoard/admin/thumbnails/DiscussionboardAdminThumbnailsController";
import { DiscussionboardAdminTopicsController } from "./controllers/discussionBoard/admin/topics/DiscussionboardAdminTopicsController";
import { DiscussionboardAdminUploadProgressController } from "./controllers/discussionBoard/admin/upload/progress/DiscussionboardAdminUploadProgressController";
import { DiscussionboardAdminUser_bansController } from "./controllers/discussionBoard/admin/user-bans/DiscussionboardAdminUser_bansController";
import { DiscussionboardAdminsController } from "./controllers/discussionBoard/admins/DiscussionboardAdminsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardArticlesAttachmentsImage_metadataController } from "./controllers/discussionBoard/articles/attachments/image-metadata/DiscussionboardArticlesAttachmentsImage_metadataController";
import { DiscussionboardArticlesAttachmentsImage_metadataExifController } from "./controllers/discussionBoard/articles/attachments/image-metadata/exif/DiscussionboardArticlesAttachmentsImage_metadataExifController";
import { DiscussionboardArticlesAttachmentsThumbnailsController } from "./controllers/discussionBoard/articles/attachments/thumbnails/DiscussionboardArticlesAttachmentsThumbnailsController";
import { DiscussionboardArticlesComment_statisticsController } from "./controllers/discussionBoard/articles/comment-statistics/DiscussionboardArticlesComment_statisticsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/articles/comments/snapshots/DiscussionboardArticlesCommentsSnapshotsController";
import { DiscussionboardArticlesCommentsTagsController } from "./controllers/discussionBoard/articles/comments/tags/DiscussionboardArticlesCommentsTagsController";
import { DiscussionboardArticlesMetadataController } from "./controllers/discussionBoard/articles/metadata/DiscussionboardArticlesMetadataController";
import { DiscussionboardArticlesReactionsController } from "./controllers/discussionBoard/articles/reactions/DiscussionboardArticlesReactionsController";
import { DiscussionboardArticlesSnapshotsController } from "./controllers/discussionBoard/articles/snapshots/DiscussionboardArticlesSnapshotsController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardAuthSuperadminController } from "./controllers/discussionBoard/auth/superAdmin/DiscussionboardAuthSuperadminController";
import { DiscussionboardGuestCross_sectionController } from "./controllers/discussionBoard/guest/cross-section/DiscussionboardGuestCross_sectionController";
import { DiscussionboardGuestDiscoveryController } from "./controllers/discussionBoard/guest/discovery/DiscussionboardGuestDiscoveryController";
import { DiscussionboardGuestHealthController } from "./controllers/discussionBoard/guest/health/DiscussionboardGuestHealthController";
import { DiscussionboardGuestPopularController } from "./controllers/discussionBoard/guest/popular/DiscussionboardGuestPopularController";
import { DiscussionboardGuestSearchController } from "./controllers/discussionBoard/guest/search/DiscussionboardGuestSearchController";
import { DiscussionboardGuestSectionsController } from "./controllers/discussionBoard/guest/sections/DiscussionboardGuestSectionsController";
import { DiscussionboardGuestSessionsController } from "./controllers/discussionBoard/guest/sessions/DiscussionboardGuestSessionsController";
import { DiscussionboardGuestTopicsController } from "./controllers/discussionBoard/guest/topics/DiscussionboardGuestTopicsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardMemberArticlesAttachmentsImage_metadataController } from "./controllers/discussionBoard/member/articles/attachments/image-metadata/DiscussionboardMemberArticlesAttachmentsImage_metadataController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesMetadataController } from "./controllers/discussionBoard/member/articles/metadata/DiscussionboardMemberArticlesMetadataController";
import { DiscussionboardMemberArticlesReactionsController } from "./controllers/discussionBoard/member/articles/reactions/DiscussionboardMemberArticlesReactionsController";
import { DiscussionboardMemberArticlesSnapshotsController } from "./controllers/discussionBoard/member/articles/snapshots/DiscussionboardMemberArticlesSnapshotsController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberCross_sectionController } from "./controllers/discussionBoard/member/cross-section/DiscussionboardMemberCross_sectionController";
import { DiscussionboardMemberDiscoveryController } from "./controllers/discussionBoard/member/discovery/DiscussionboardMemberDiscoveryController";
import { DiscussionboardMemberEngagementController } from "./controllers/discussionBoard/member/engagement/DiscussionboardMemberEngagementController";
import { DiscussionboardMemberFavoritesController } from "./controllers/discussionBoard/member/favorites/DiscussionboardMemberFavoritesController";
import { DiscussionboardMemberHealthController } from "./controllers/discussionBoard/member/health/DiscussionboardMemberHealthController";
import { DiscussionboardMemberOrganizeAttachmentsController } from "./controllers/discussionBoard/member/organize/attachments/DiscussionboardMemberOrganizeAttachmentsController";
import { DiscussionboardMemberPopularController } from "./controllers/discussionBoard/member/popular/DiscussionboardMemberPopularController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSearchController } from "./controllers/discussionBoard/member/search/DiscussionboardMemberSearchController";
import { DiscussionboardMemberSearchAttachmentsController } from "./controllers/discussionBoard/member/search/attachments/DiscussionboardMemberSearchAttachmentsController";
import { DiscussionboardMemberSectionsController } from "./controllers/discussionBoard/member/sections/DiscussionboardMemberSectionsController";
import { DiscussionboardMemberTopicsController } from "./controllers/discussionBoard/member/topics/DiscussionboardMemberTopicsController";
import { DiscussionboardMemberUploadProgressController } from "./controllers/discussionBoard/member/upload/progress/DiscussionboardMemberUploadProgressController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSuper_adminsController } from "./controllers/discussionBoard/super-admins/DiscussionboardSuper_adminsController";
import { DiscussionboardSuperadminAdmin_request_decisionsController } from "./controllers/discussionBoard/superAdmin/admin-request-decisions/DiscussionboardSuperadminAdmin_request_decisionsController";
import { DiscussionboardSuperadminAdmin_requestsController } from "./controllers/discussionBoard/superAdmin/admin-requests/DiscussionboardSuperadminAdmin_requestsController";
import { DiscussionboardSuperadminAdmin_requestsHistoryController } from "./controllers/discussionBoard/superAdmin/admin-requests/history/DiscussionboardSuperadminAdmin_requestsHistoryController";
import { DiscussionboardSuperadminAdmin_requestsPendingController } from "./controllers/discussionBoard/superAdmin/admin-requests/pending/DiscussionboardSuperadminAdmin_requestsPendingController";
import { DiscussionboardSuperadminAdministrationsAnalyticsController } from "./controllers/discussionBoard/superAdmin/administrations/analytics/DiscussionboardSuperadminAdministrationsAnalyticsController";
import { DiscussionboardSuperadminAdministrative_historiesController } from "./controllers/discussionBoard/superAdmin/administrative-histories/DiscussionboardSuperadminAdministrative_historiesController";
import { DiscussionboardSuperadminAdministrator_assignmentsController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/DiscussionboardSuperadminAdministrator_assignmentsController";
import { DiscussionboardSuperadminAdministrator_assignmentsBy_adminsController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/by-admins/DiscussionboardSuperadminAdministrator_assignmentsBy_adminsController";
import { DiscussionboardSuperadminAdministrator_assignmentsBy_membersController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/by-members/DiscussionboardSuperadminAdministrator_assignmentsBy_membersController";
import { DiscussionboardSuperadminAdministrator_assignmentsBy_super_adminsController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/by-super-admins/DiscussionboardSuperadminAdministrator_assignmentsBy_super_adminsController";
import { DiscussionboardSuperadminAdministrator_assignmentsHistoryController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/history/DiscussionboardSuperadminAdministrator_assignmentsHistoryController";
import { DiscussionboardSuperadminAdministrator_assignmentsTo_adminsController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/to-admins/DiscussionboardSuperadminAdministrator_assignmentsTo_adminsController";
import { DiscussionboardSuperadminAdministrator_assignmentsTo_membersController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/to-members/DiscussionboardSuperadminAdministrator_assignmentsTo_membersController";
import { DiscussionboardSuperadminAdministrator_assignmentsTo_super_adminsController } from "./controllers/discussionBoard/superAdmin/administrator-assignments/to-super-admins/DiscussionboardSuperadminAdministrator_assignmentsTo_super_adminsController";
import { DiscussionboardSuperadminAdministratorsController } from "./controllers/discussionBoard/superAdmin/administrators/promote/DiscussionboardSuperadminAdministratorsController";
import { DiscussionboardSuperadminAlertsCapacityController } from "./controllers/discussionBoard/superAdmin/alerts/capacity/DiscussionboardSuperadminAlertsCapacityController";
import { DiscussionboardSuperadminAnalyticsController } from "./controllers/discussionBoard/superAdmin/analytics/DiscussionboardSuperadminAnalyticsController";
import { DiscussionboardSuperadminAnalyticsDownloadsController } from "./controllers/discussionBoard/superAdmin/analytics/downloads/DiscussionboardSuperadminAnalyticsDownloadsController";
import { DiscussionboardSuperadminArticlesAttachmentsController } from "./controllers/discussionBoard/superAdmin/articles/attachments/DiscussionboardSuperadminArticlesAttachmentsController";
import { DiscussionboardSuperadminArticlesAttachmentsImage_metadataController } from "./controllers/discussionBoard/superAdmin/articles/attachments/image-metadata/DiscussionboardSuperadminArticlesAttachmentsImage_metadataController";
import { DiscussionboardSuperadminArticlesMetricsController } from "./controllers/discussionBoard/superAdmin/articles/metrics/DiscussionboardSuperadminArticlesMetricsController";
import { DiscussionboardSuperadminAttachment_categoriesController } from "./controllers/discussionBoard/superAdmin/attachment-categories/DiscussionboardSuperadminAttachment_categoriesController";
import { DiscussionboardSuperadminAttachment_category_mappingsController } from "./controllers/discussionBoard/superAdmin/attachment-category-mappings/DiscussionboardSuperadminAttachment_category_mappingsController";
import { DiscussionboardSuperadminAttachment_downloadsController } from "./controllers/discussionBoard/superAdmin/attachment-downloads/DiscussionboardSuperadminAttachment_downloadsController";
import { DiscussionboardSuperadminAttachment_snapshotsController } from "./controllers/discussionBoard/superAdmin/attachment-snapshots/DiscussionboardSuperadminAttachment_snapshotsController";
import { DiscussionboardSuperadminAudit_logsController } from "./controllers/discussionBoard/superAdmin/audit-logs/DiscussionboardSuperadminAudit_logsController";
import { DiscussionboardSuperadminBulkCategorizeController } from "./controllers/discussionBoard/superAdmin/bulk/categorize/DiscussionboardSuperadminBulkCategorizeController";
import { DiscussionboardSuperadminCommentsDeletion_impactController } from "./controllers/discussionBoard/superAdmin/comments/deletion-impact/DiscussionboardSuperadminCommentsDeletion_impactController";
import { DiscussionboardSuperadminCommentsMetricsController } from "./controllers/discussionBoard/superAdmin/comments/metrics/DiscussionboardSuperadminCommentsMetricsController";
import { DiscussionboardSuperadminCross_sectionController } from "./controllers/discussionBoard/superAdmin/cross-section/DiscussionboardSuperadminCross_sectionController";
import { DiscussionboardSuperadminDashboardController } from "./controllers/discussionBoard/superAdmin/dashboard/DiscussionboardSuperadminDashboardController";
import { DiscussionboardSuperadminDashboardCategoriesController } from "./controllers/discussionBoard/superAdmin/dashboard/categories/DiscussionboardSuperadminDashboardCategoriesController";
import { DiscussionboardSuperadminDiscoveryController } from "./controllers/discussionBoard/superAdmin/discovery/DiscussionboardSuperadminDiscoveryController";
import { DiscussionboardSuperadminDuplicationController } from "./controllers/discussionBoard/superAdmin/duplication/DiscussionboardSuperadminDuplicationController";
import { DiscussionboardSuperadminEngagementController } from "./controllers/discussionBoard/superAdmin/engagement/DiscussionboardSuperadminEngagementController";
import { DiscussionboardSuperadminGovernanceOversightController } from "./controllers/discussionBoard/superAdmin/governance/oversight/DiscussionboardSuperadminGovernanceOversightController";
import { DiscussionboardSuperadminHealthController } from "./controllers/discussionBoard/superAdmin/health/DiscussionboardSuperadminHealthController";
import { DiscussionboardSuperadminHierarchyController } from "./controllers/discussionBoard/superAdmin/hierarchy/DiscussionboardSuperadminHierarchyController";
import { DiscussionboardSuperadminMaintenance_schedulesController } from "./controllers/discussionBoard/superAdmin/maintenance-schedules/DiscussionboardSuperadminMaintenance_schedulesController";
import { DiscussionboardSuperadminMaintenanceExecutionController } from "./controllers/discussionBoard/superAdmin/maintenance/execution/DiscussionboardSuperadminMaintenanceExecutionController";
import { DiscussionboardSuperadminMetricsController } from "./controllers/discussionBoard/superAdmin/metrics/DiscussionboardSuperadminMetricsController";
import { DiscussionboardSuperadminModerationsMetricsController } from "./controllers/discussionBoard/superAdmin/moderations/metrics/DiscussionboardSuperadminModerationsMetricsController";
import { DiscussionboardSuperadminMonitoringController } from "./controllers/discussionBoard/superAdmin/monitoring/DiscussionboardSuperadminMonitoringController";
import { DiscussionboardSuperadminMonitoringAttachment_usageController } from "./controllers/discussionBoard/superAdmin/monitoring/attachment-usage/DiscussionboardSuperadminMonitoringAttachment_usageController";
import { DiscussionboardSuperadminNotificationsDeliveryController } from "./controllers/discussionBoard/superAdmin/notifications/delivery/DiscussionboardSuperadminNotificationsDeliveryController";
import { DiscussionboardSuperadminPopularController } from "./controllers/discussionBoard/superAdmin/popular/DiscussionboardSuperadminPopularController";
import { DiscussionboardSuperadminReactionsAnalyticsController } from "./controllers/discussionBoard/superAdmin/reactions/analytics/DiscussionboardSuperadminReactionsAnalyticsController";
import { DiscussionboardSuperadminSearchController } from "./controllers/discussionBoard/superAdmin/search/DiscussionboardSuperadminSearchController";
import { DiscussionboardSuperadminSearchAttachmentsController } from "./controllers/discussionBoard/superAdmin/search/attachments/DiscussionboardSuperadminSearchAttachmentsController";
import { DiscussionboardSuperadminSectionsController } from "./controllers/discussionBoard/superAdmin/sections/DiscussionboardSuperadminSectionsController";
import { DiscussionboardSuperadminSectionsDeletionsController } from "./controllers/discussionBoard/superAdmin/sections/deletions/DiscussionboardSuperadminSectionsDeletionsController";
import { DiscussionboardSuperadminSectionsSnapshotsController } from "./controllers/discussionBoard/superAdmin/sections/snapshots/DiscussionboardSuperadminSectionsSnapshotsController";
import { DiscussionboardSuperadminStatus_enumsController } from "./controllers/discussionBoard/superAdmin/status-enums/DiscussionboardSuperadminStatus_enumsController";
import { DiscussionboardSuperadminStatus_enumsDependenciesController } from "./controllers/discussionBoard/superAdmin/status-enums/dependencies/DiscussionboardSuperadminStatus_enumsDependenciesController";
import { DiscussionboardSuperadminStatus_enumsReferencesController } from "./controllers/discussionBoard/superAdmin/status-enums/references/DiscussionboardSuperadminStatus_enumsReferencesController";
import { DiscussionboardSuperadminStatus_enumsSnapshotsController } from "./controllers/discussionBoard/superAdmin/status-enums/snapshots/DiscussionboardSuperadminStatus_enumsSnapshotsController";
import { DiscussionboardSuperadminStatus_typesController } from "./controllers/discussionBoard/superAdmin/status-types/DiscussionboardSuperadminStatus_typesController";
import { DiscussionboardSuperadminSystem_audit_logsParametersController } from "./controllers/discussionBoard/superAdmin/system-audit-logs/parameters/DiscussionboardSuperadminSystem_audit_logsParametersController";
import { DiscussionboardSuperadminSystem_configurationsController } from "./controllers/discussionBoard/superAdmin/system-configurations/DiscussionboardSuperadminSystem_configurationsController";
import { DiscussionboardSuperadminSystem_health_metricsMetadataController } from "./controllers/discussionBoard/superAdmin/system-health-metrics/metadata/DiscussionboardSuperadminSystem_health_metricsMetadataController";
import { DiscussionboardSuperadminSystem_metadataController } from "./controllers/discussionBoard/superAdmin/system-metadata/DiscussionboardSuperadminSystem_metadataController";
import { DiscussionboardSuperadminSystem_notificationsController } from "./controllers/discussionBoard/superAdmin/system-notifications/DiscussionboardSuperadminSystem_notificationsController";
import { DiscussionboardSuperadminSystem_notificationsSubtypesController } from "./controllers/discussionBoard/superAdmin/system-notifications/subtypes/DiscussionboardSuperadminSystem_notificationsSubtypesController";
import { DiscussionboardSuperadminSystemMetricsController } from "./controllers/discussionBoard/superAdmin/system/metrics/DiscussionboardSuperadminSystemMetricsController";
import { DiscussionboardSuperadminThumbnailsController } from "./controllers/discussionBoard/superAdmin/thumbnails/DiscussionboardSuperadminThumbnailsController";
import { DiscussionboardSuperadminTopicsController } from "./controllers/discussionBoard/superAdmin/topics/DiscussionboardSuperadminTopicsController";
import { DiscussionboardSuperadminUploadProgressController } from "./controllers/discussionBoard/superAdmin/upload/progress/DiscussionboardSuperadminUploadProgressController";
import { DiscussionboardSuperadminUser_bansController } from "./controllers/discussionBoard/superAdmin/user-bans/DiscussionboardSuperadminUser_bansController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuperadminController,
    DiscussionboardGuestsController,
    DiscussionboardGuestSessionsController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardAdminsController,
    DiscussionboardSuper_adminsController,
    DiscussionboardAdminStatus_enumsController,
    DiscussionboardSuperadminStatus_enumsController,
    DiscussionboardAdminStatus_typesController,
    DiscussionboardSuperadminStatus_typesController,
    DiscussionboardAdminSystem_configurationsController,
    DiscussionboardSuperadminSystem_configurationsController,
    DiscussionboardAdminSystem_metadataController,
    DiscussionboardSuperadminSystem_metadataController,
    DiscussionboardAdminSystem_notificationsController,
    DiscussionboardSuperadminSystem_notificationsController,
    DiscussionboardAdminMaintenance_schedulesController,
    DiscussionboardSuperadminMaintenance_schedulesController,
    DiscussionboardAdminStatus_enumsSnapshotsController,
    DiscussionboardSuperadminStatus_enumsSnapshotsController,
    DiscussionboardAdminStatus_enumsReferencesController,
    DiscussionboardSuperadminStatus_enumsReferencesController,
    DiscussionboardAdminSystem_audit_logsParametersController,
    DiscussionboardSuperadminSystem_audit_logsParametersController,
    DiscussionboardAdminSystem_notificationsSubtypesController,
    DiscussionboardSuperadminSystem_notificationsSubtypesController,
    DiscussionboardAdminSystem_health_metricsMetadataController,
    DiscussionboardSuperadminSystem_health_metricsMetadataController,
    DiscussionboardSectionsController,
    DiscussionboardGuestSectionsController,
    DiscussionboardMemberSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardSuperadminSectionsController,
    DiscussionboardAdminSectionsSnapshotsController,
    DiscussionboardSuperadminSectionsSnapshotsController,
    DiscussionboardAdminSectionsDeletionsController,
    DiscussionboardSuperadminSectionsDeletionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardTagsController,
    DiscussionboardArticlesTagsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardArticlesSnapshotsController,
    DiscussionboardMemberArticlesSnapshotsController,
    DiscussionboardMemberFavoritesController,
    DiscussionboardArticlesReactionsController,
    DiscussionboardMemberArticlesReactionsController,
    DiscussionboardArticlesMetadataController,
    DiscussionboardMemberArticlesMetadataController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsActivitiesController,
    DiscussionboardAdminArticlesCommentsDeletionsController,
    DiscussionboardAdminArticlesCommentsActivitiesMetadataController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardArticlesCommentsSnapshotsController,
    DiscussionboardArticlesCommentsTagsController,
    DiscussionboardArticlesComment_statisticsController,
    DiscussionboardSuperadminAdmin_requestsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardSuperadminAdmin_request_decisionsController,
    DiscussionboardAdminUser_bansController,
    DiscussionboardSuperadminUser_bansController,
    DiscussionboardSuperadminAdministrator_assignmentsController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardSuperadminAudit_logsController,
    DiscussionboardAdminAdministrative_historiesController,
    DiscussionboardSuperadminAdministrative_historiesController,
    DiscussionboardSuperadminAdministrator_assignmentsTo_membersController,
    DiscussionboardSuperadminAdministrator_assignmentsTo_adminsController,
    DiscussionboardSuperadminAdministrator_assignmentsTo_super_adminsController,
    DiscussionboardSuperadminAdministrator_assignmentsBy_membersController,
    DiscussionboardSuperadminAdministrator_assignmentsBy_adminsController,
    DiscussionboardSuperadminAdministrator_assignmentsBy_super_adminsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardAdminArticlesAttachmentsController,
    DiscussionboardSuperadminArticlesAttachmentsController,
    DiscussionboardArticlesAttachmentsImage_metadataController,
    DiscussionboardMemberArticlesAttachmentsImage_metadataController,
    DiscussionboardAdminArticlesAttachmentsImage_metadataController,
    DiscussionboardSuperadminArticlesAttachmentsImage_metadataController,
    DiscussionboardAdminAttachment_downloadsController,
    DiscussionboardSuperadminAttachment_downloadsController,
    DiscussionboardAdminAttachment_categoriesController,
    DiscussionboardSuperadminAttachment_categoriesController,
    DiscussionboardAdminAttachment_snapshotsController,
    DiscussionboardSuperadminAttachment_snapshotsController,
    DiscussionboardAdminThumbnailsController,
    DiscussionboardSuperadminThumbnailsController,
    DiscussionboardArticlesAttachmentsImage_metadataExifController,
    DiscussionboardAdminAttachment_category_mappingsController,
    DiscussionboardSuperadminAttachment_category_mappingsController,
    DiscussionboardArticlesAttachmentsThumbnailsController,
    DiscussionboardGuestHealthController,
    DiscussionboardMemberHealthController,
    DiscussionboardAdminHealthController,
    DiscussionboardSuperadminHealthController,
    DiscussionboardSuperadminMetricsController,
    DiscussionboardSuperadminHierarchyController,
    DiscussionboardSuperadminGovernanceOversightController,
    DiscussionboardSuperadminNotificationsDeliveryController,
    DiscussionboardSuperadminMaintenanceExecutionController,
    DiscussionboardSuperadminStatus_enumsDependenciesController,
    DiscussionboardSuperadminDashboardController,
    DiscussionboardAdminAnalyticsController,
    DiscussionboardSuperadminAnalyticsController,
    DiscussionboardAdminDuplicationController,
    DiscussionboardSuperadminDuplicationController,
    DiscussionboardGuestSearchController,
    DiscussionboardMemberSearchController,
    DiscussionboardAdminSearchController,
    DiscussionboardSuperadminSearchController,
    DiscussionboardGuestPopularController,
    DiscussionboardMemberPopularController,
    DiscussionboardAdminPopularController,
    DiscussionboardSuperadminPopularController,
    DiscussionboardAdminReactionsAnalyticsController,
    DiscussionboardSuperadminReactionsAnalyticsController,
    DiscussionboardAdminArticlesMetricsController,
    DiscussionboardSuperadminArticlesMetricsController,
    DiscussionboardGuestDiscoveryController,
    DiscussionboardMemberDiscoveryController,
    DiscussionboardAdminDiscoveryController,
    DiscussionboardSuperadminDiscoveryController,
    DiscussionboardGuestCross_sectionController,
    DiscussionboardMemberCross_sectionController,
    DiscussionboardAdminCross_sectionController,
    DiscussionboardSuperadminCross_sectionController,
    DiscussionboardGuestTopicsController,
    DiscussionboardMemberTopicsController,
    DiscussionboardAdminTopicsController,
    DiscussionboardSuperadminTopicsController,
    DiscussionboardSuperadminMonitoringController,
    DiscussionboardMemberEngagementController,
    DiscussionboardAdminEngagementController,
    DiscussionboardSuperadminEngagementController,
    DiscussionboardAdminCommentsDeletion_impactController,
    DiscussionboardSuperadminCommentsDeletion_impactController,
    DiscussionboardAdminModerationsMetricsController,
    DiscussionboardSuperadminModerationsMetricsController,
    DiscussionboardSuperadminCommentsMetricsController,
    DiscussionboardSuperadminAdmin_requestsHistoryController,
    DiscussionboardSuperadminAdministrationsAnalyticsController,
    DiscussionboardSuperadminAdministratorsController,
    DiscussionboardAdminBansDashboardController,
    DiscussionboardSuperadminSystemMetricsController,
    DiscussionboardSuperadminAdmin_requestsPendingController,
    DiscussionboardSuperadminAdministrator_assignmentsHistoryController,
    DiscussionboardAdminAnalyticsDownloadsController,
    DiscussionboardSuperadminAnalyticsDownloadsController,
    DiscussionboardAdminDashboardCategoriesController,
    DiscussionboardSuperadminDashboardCategoriesController,
    DiscussionboardMemberSearchAttachmentsController,
    DiscussionboardAdminSearchAttachmentsController,
    DiscussionboardSuperadminSearchAttachmentsController,
    DiscussionboardAdminBulkCategorizeController,
    DiscussionboardSuperadminBulkCategorizeController,
    DiscussionboardMemberOrganizeAttachmentsController,
    DiscussionboardAdminMonitoringAttachment_usageController,
    DiscussionboardSuperadminMonitoringAttachment_usageController,
    DiscussionboardMemberUploadProgressController,
    DiscussionboardAdminUploadProgressController,
    DiscussionboardSuperadminUploadProgressController,
    DiscussionboardAdminAlertsCapacityController,
    DiscussionboardSuperadminAlertsCapacityController,
  ],
})
export class MyModule {}
