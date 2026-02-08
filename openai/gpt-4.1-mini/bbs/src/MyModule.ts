import { Module } from "@nestjs/common";

import { DiscussionboardAdministratorAdministrator_grade_changesController } from "./controllers/discussionBoard/administrator/administrator-grade-changes/DiscussionboardAdministratorAdministrator_grade_changesController";
import { DiscussionboardAdministratorAdministratorgradesController } from "./controllers/discussionBoard/administrator/administratorGrades/DiscussionboardAdministratorAdministratorgradesController";
import { DiscussionboardAdministratorAdministratorpromotionsController } from "./controllers/discussionBoard/administrator/administratorPromotions/DiscussionboardAdministratorAdministratorpromotionsController";
import { DiscussionboardAdministratorAdministratorrequestsController } from "./controllers/discussionBoard/administrator/administratorRequests/DiscussionboardAdministratorAdministratorrequestsController";
import { DiscussionboardAdministratorAdministratorsController } from "./controllers/discussionBoard/administrator/administrators/DiscussionboardAdministratorAdministratorsController";
import { DiscussionboardAdministratorArticlesController } from "./controllers/discussionBoard/administrator/articles/DiscussionboardAdministratorArticlesController";
import { DiscussionboardAdministratorArticlesFilesController } from "./controllers/discussionBoard/administrator/articles/files/DiscussionboardAdministratorArticlesFilesController";
import { DiscussionboardAdministratorArticlesImagesController } from "./controllers/discussionBoard/administrator/articles/images/DiscussionboardAdministratorArticlesImagesController";
import { DiscussionboardAdministratorArticlesTag_mappingsController } from "./controllers/discussionBoard/administrator/articles/tag-mappings/DiscussionboardAdministratorArticlesTag_mappingsController";
import { DiscussionboardAdministratorAuditlogsController } from "./controllers/discussionBoard/administrator/auditLogs/DiscussionboardAdministratorAuditlogsController";
import { DiscussionboardAdministratorCommentsController } from "./controllers/discussionBoard/administrator/comments/DiscussionboardAdministratorCommentsController";
import { DiscussionboardAdministratorCommentsSnapshotsController } from "./controllers/discussionBoard/administrator/comments/snapshots/DiscussionboardAdministratorCommentsSnapshotsController";
import { DiscussionboardAdministratorFeatureflagsController } from "./controllers/discussionBoard/administrator/featureFlags/DiscussionboardAdministratorFeatureflagsController";
import { DiscussionboardAdministratorHealthchecksController } from "./controllers/discussionBoard/administrator/healthChecks/DiscussionboardAdministratorHealthchecksController";
import { DiscussionboardAdministratorScheduledtasksController } from "./controllers/discussionBoard/administrator/scheduledTasks/DiscussionboardAdministratorScheduledtasksController";
import { DiscussionboardAdministratorSectionsController } from "./controllers/discussionBoard/administrator/sections/DiscussionboardAdministratorSectionsController";
import { DiscussionboardAdministratorSectionsAdminlogsController } from "./controllers/discussionBoard/administrator/sections/adminLogs/DiscussionboardAdministratorSectionsAdminlogsController";
import { DiscussionboardAdministratorSystemmessagesController } from "./controllers/discussionBoard/administrator/systemMessages/DiscussionboardAdministratorSystemmessagesController";
import { DiscussionboardAdministratorSystemsettingsController } from "./controllers/discussionBoard/administrator/systemSettings/DiscussionboardAdministratorSystemsettingsController";
import { DiscussionboardAdministratorTagsArticlesController } from "./controllers/discussionBoard/administrator/tags/articles/DiscussionboardAdministratorTagsArticlesController";
import { DiscussionboardAdministratorTagsUsage_statsSummaryController } from "./controllers/discussionBoard/administrator/tags/usage-stats/summary/DiscussionboardAdministratorTagsUsage_statsSummaryController";
import { DiscussionboardAdministratorUserbansController } from "./controllers/discussionBoard/administrator/userBans/DiscussionboardAdministratorUserbansController";
import { DiscussionboardAdministratorUserbansReportController } from "./controllers/discussionBoard/administrator/userBans/report/DiscussionboardAdministratorUserbansReportController";
import { DiscussionboardAdministratorUserbansUnbanController } from "./controllers/discussionBoard/administrator/userBans/unban/DiscussionboardAdministratorUserbansUnbanController";
import { DiscussionboardAdministratorUserunbansController } from "./controllers/discussionBoard/administrator/userUnbans/DiscussionboardAdministratorUserunbansController";
import { DiscussionboardArticle_search_indexesController } from "./controllers/discussionBoard/article-search-indexes/DiscussionboardArticle_search_indexesController";
import { DiscussionboardArticle_tag_mappingsController } from "./controllers/discussionBoard/article-tag-mappings/DiscussionboardArticle_tag_mappingsController";
import { DiscussionboardAudit_logsQueryController } from "./controllers/discussionBoard/audit-logs/query/DiscussionboardAudit_logsQueryController";
import { DiscussionboardAuthAdministratorController } from "./controllers/discussionBoard/auth/administrator/DiscussionboardAuthAdministratorController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthRegistereduserController } from "./controllers/discussionBoard/auth/registeredUser/DiscussionboardAuthRegistereduserController";
import { DiscussionboardAuthSuperadministratorController } from "./controllers/discussionBoard/auth/superAdministrator/DiscussionboardAuthSuperadministratorController";
import { DiscussionboardFeature_flagsBulk_updateController } from "./controllers/discussionBoard/feature-flags/bulk-update/DiscussionboardFeature_flagsBulk_updateController";
import { DiscussionboardGuestGuestsessionsController } from "./controllers/discussionBoard/guest/guestSessions/DiscussionboardGuestGuestsessionsController";
import { DiscussionboardGuestGuestsController } from "./controllers/discussionBoard/guest/guests/DiscussionboardGuestGuestsController";
import { DiscussionboardGuestSearchArticlesController } from "./controllers/discussionBoard/guest/search/articles/DiscussionboardGuestSearchArticlesController";
import { DiscussionboardGuestTagsAutocompleteController } from "./controllers/discussionBoard/guest/tags/autocomplete/DiscussionboardGuestTagsAutocompleteController";
import { DiscussionboardGuestTagsPopularController } from "./controllers/discussionBoard/guest/tags/popular/DiscussionboardGuestTagsPopularController";
import { DiscussionboardGuestTagsUsage_statsController } from "./controllers/discussionBoard/guest/tags/usage-stats/DiscussionboardGuestTagsUsage_statsController";
import { DiscussionboardRegistereduserArticlesController } from "./controllers/discussionBoard/registeredUser/articles/DiscussionboardRegistereduserArticlesController";
import { DiscussionboardRegistereduserArticlesFilesController } from "./controllers/discussionBoard/registeredUser/articles/files/DiscussionboardRegistereduserArticlesFilesController";
import { DiscussionboardRegistereduserArticlesImagesController } from "./controllers/discussionBoard/registeredUser/articles/images/DiscussionboardRegistereduserArticlesImagesController";
import { DiscussionboardRegistereduserArticlesTag_mappingsController } from "./controllers/discussionBoard/registeredUser/articles/tag-mappings/DiscussionboardRegistereduserArticlesTag_mappingsController";
import { DiscussionboardRegistereduserCommentsController } from "./controllers/discussionBoard/registeredUser/comments/DiscussionboardRegistereduserCommentsController";
import { DiscussionboardRegistereduserEmailverificationsController } from "./controllers/discussionBoard/registeredUser/emailVerifications/DiscussionboardRegistereduserEmailverificationsController";
import { DiscussionboardRegistereduserPasswordresetsController } from "./controllers/discussionBoard/registeredUser/passwordResets/DiscussionboardRegistereduserPasswordresetsController";
import { DiscussionboardRegistereduserProfileController } from "./controllers/discussionBoard/registeredUser/profile/DiscussionboardRegistereduserProfileController";
import { DiscussionboardRegistereduserRegisteredusersController } from "./controllers/discussionBoard/registeredUser/registeredUsers/DiscussionboardRegistereduserRegisteredusersController";
import { DiscussionboardRegistereduserSearchArticlesController } from "./controllers/discussionBoard/registeredUser/search/articles/DiscussionboardRegistereduserSearchArticlesController";
import { DiscussionboardRegistereduserSessionsController } from "./controllers/discussionBoard/registeredUser/sessions/DiscussionboardRegistereduserSessionsController";
import { DiscussionboardRegistereduserTagsAutocompleteController } from "./controllers/discussionBoard/registeredUser/tags/autocomplete/DiscussionboardRegistereduserTagsAutocompleteController";
import { DiscussionboardRegistereduserTagsPopularController } from "./controllers/discussionBoard/registeredUser/tags/popular/DiscussionboardRegistereduserTagsPopularController";
import { DiscussionboardRegistereduserTagsUsage_statsController } from "./controllers/discussionBoard/registeredUser/tags/usage-stats/DiscussionboardRegistereduserTagsUsage_statsController";
import { DiscussionboardScheduled_tasksController } from "./controllers/discussionBoard/scheduled-tasks/trigger/DiscussionboardScheduled_tasksController";
import { DiscussionboardSuperadministratorAdministrator_grade_changesController } from "./controllers/discussionBoard/superAdministrator/administrator-grade-changes/DiscussionboardSuperadministratorAdministrator_grade_changesController";
import { DiscussionboardSuperadministratorAdministratorrequestsController } from "./controllers/discussionBoard/superAdministrator/administratorRequests/DiscussionboardSuperadministratorAdministratorrequestsController";
import { DiscussionboardSuperadministratorAdministratorrequestsPendingController } from "./controllers/discussionBoard/superAdministrator/administratorRequests/pending/DiscussionboardSuperadministratorAdministratorrequestsPendingController";
import { DiscussionboardSuperadministratorAdministratorsController } from "./controllers/discussionBoard/superAdministrator/administrators/DiscussionboardSuperadministratorAdministratorsController";
import { DiscussionboardSuperadministratorAuditlogsController } from "./controllers/discussionBoard/superAdministrator/auditLogs/DiscussionboardSuperadministratorAuditlogsController";
import { DiscussionboardSuperadministratorFeatureflagsController } from "./controllers/discussionBoard/superAdministrator/featureFlags/DiscussionboardSuperadministratorFeatureflagsController";
import { DiscussionboardSuperadministratorHealthchecksController } from "./controllers/discussionBoard/superAdministrator/healthChecks/DiscussionboardSuperadministratorHealthchecksController";
import { DiscussionboardSuperadministratorScheduledtasksController } from "./controllers/discussionBoard/superAdministrator/scheduledTasks/DiscussionboardSuperadministratorScheduledtasksController";
import { DiscussionboardSuperadministratorSuperadministratorsController } from "./controllers/discussionBoard/superAdministrator/superAdministrators/DiscussionboardSuperadministratorSuperadministratorsController";
import { DiscussionboardSuperadministratorSystemmessagesController } from "./controllers/discussionBoard/superAdministrator/systemMessages/DiscussionboardSuperadministratorSystemmessagesController";
import { DiscussionboardSuperadministratorSystemsettingsController } from "./controllers/discussionBoard/superAdministrator/systemSettings/DiscussionboardSuperadministratorSystemsettingsController";
import { DiscussionboardSuperadministratorTagsArticlesController } from "./controllers/discussionBoard/superAdministrator/tags/articles/DiscussionboardSuperadministratorTagsArticlesController";
import { DiscussionboardSuperadministratorTagsUsage_statsSummaryController } from "./controllers/discussionBoard/superAdministrator/tags/usage-stats/summary/DiscussionboardSuperadministratorTagsUsage_statsSummaryController";
import { DiscussionboardSuperadministratorUserbansReportController } from "./controllers/discussionBoard/superAdministrator/userBans/report/DiscussionboardSuperadministratorUserbansReportController";
import { DiscussionboardSystem_messagesListController } from "./controllers/discussionBoard/system-messages/list/DiscussionboardSystem_messagesListController";
import { DiscussionboardSystem_settingsRefreshController } from "./controllers/discussionBoard/system-settings/refresh/DiscussionboardSystem_settingsRefreshController";
import { DiscussionboardSystemHealth_overviewController } from "./controllers/discussionBoard/system/health-overview/DiscussionboardSystemHealth_overviewController";
import { DiscussionboardTag_usage_statsController } from "./controllers/discussionBoard/tag-usage-stats/DiscussionboardTag_usage_statsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthRegistereduserController,
    DiscussionboardAuthAdministratorController,
    DiscussionboardAuthSuperadministratorController,
    DiscussionboardGuestGuestsController,
    DiscussionboardGuestGuestsessionsController,
    DiscussionboardRegistereduserRegisteredusersController,
    DiscussionboardRegistereduserProfileController,
    DiscussionboardRegistereduserSessionsController,
    DiscussionboardRegistereduserPasswordresetsController,
    DiscussionboardRegistereduserEmailverificationsController,
    DiscussionboardAdministratorAdministratorsController,
    DiscussionboardSuperadministratorSuperadministratorsController,
    DiscussionboardAdministratorSectionsController,
    DiscussionboardAdministratorSectionsAdminlogsController,
    DiscussionboardRegistereduserArticlesController,
    DiscussionboardAdministratorArticlesController,
    DiscussionboardRegistereduserArticlesFilesController,
    DiscussionboardAdministratorArticlesFilesController,
    DiscussionboardRegistereduserArticlesImagesController,
    DiscussionboardAdministratorArticlesImagesController,
    DiscussionboardRegistereduserArticlesTag_mappingsController,
    DiscussionboardAdministratorArticlesTag_mappingsController,
    DiscussionboardAdministratorAdministrator_grade_changesController,
    DiscussionboardSuperadministratorAdministrator_grade_changesController,
    DiscussionboardRegistereduserCommentsController,
    DiscussionboardAdministratorCommentsController,
    DiscussionboardAdministratorCommentsSnapshotsController,
    DiscussionboardAdministratorAdministratorrequestsController,
    DiscussionboardAdministratorAdministratorgradesController,
    DiscussionboardAdministratorAdministratorpromotionsController,
    DiscussionboardAdministratorUserbansController,
    DiscussionboardAdministratorUserunbansController,
    DiscussionboardTagsController,
    DiscussionboardArticle_tag_mappingsController,
    DiscussionboardArticle_search_indexesController,
    DiscussionboardTag_usage_statsController,
    DiscussionboardAdministratorAuditlogsController,
    DiscussionboardSuperadministratorAuditlogsController,
    DiscussionboardAdministratorFeatureflagsController,
    DiscussionboardSuperadministratorFeatureflagsController,
    DiscussionboardAdministratorScheduledtasksController,
    DiscussionboardSuperadministratorScheduledtasksController,
    DiscussionboardAdministratorHealthchecksController,
    DiscussionboardSuperadministratorHealthchecksController,
    DiscussionboardAdministratorSystemmessagesController,
    DiscussionboardSuperadministratorSystemmessagesController,
    DiscussionboardAdministratorSystemsettingsController,
    DiscussionboardSuperadministratorSystemsettingsController,
    DiscussionboardSuperadministratorAdministratorrequestsPendingController,
    DiscussionboardSuperadministratorAdministratorrequestsController,
    DiscussionboardSuperadministratorAdministratorsController,
    DiscussionboardAdministratorUserbansUnbanController,
    DiscussionboardAdministratorUserbansReportController,
    DiscussionboardSuperadministratorUserbansReportController,
    DiscussionboardGuestSearchArticlesController,
    DiscussionboardRegistereduserSearchArticlesController,
    DiscussionboardGuestTagsPopularController,
    DiscussionboardRegistereduserTagsPopularController,
    DiscussionboardGuestTagsUsage_statsController,
    DiscussionboardRegistereduserTagsUsage_statsController,
    DiscussionboardGuestTagsAutocompleteController,
    DiscussionboardRegistereduserTagsAutocompleteController,
    DiscussionboardAdministratorTagsArticlesController,
    DiscussionboardSuperadministratorTagsArticlesController,
    DiscussionboardAdministratorTagsUsage_statsSummaryController,
    DiscussionboardSuperadministratorTagsUsage_statsSummaryController,
    DiscussionboardSystemHealth_overviewController,
    DiscussionboardAudit_logsQueryController,
    DiscussionboardScheduled_tasksController,
    DiscussionboardFeature_flagsBulk_updateController,
    DiscussionboardSystem_messagesListController,
    DiscussionboardSystem_settingsRefreshController,
  ],
})
export class MyModule {}
