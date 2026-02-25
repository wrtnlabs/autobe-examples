import { Module } from "@nestjs/common";

import { EconomicboardAdministratorAdminBanned_usersController } from "./controllers/economicBoard/administrator/admin/banned-users/EconomicboardAdministratorAdminBanned_usersController";
import { EconomicboardAdministratorAdminUsersController } from "./controllers/economicBoard/administrator/admin/users/EconomicboardAdministratorAdminUsersController";
import { EconomicboardAdministratorAdminUsers_unbanController } from "./controllers/economicBoard/administrator/admin/users/unban/EconomicboardAdministratorAdminUsers_unbanController";
import { EconomicboardAdministratorAnalyticsController } from "./controllers/economicBoard/administrator/analytics/EconomicboardAdministratorAnalyticsController";
import { EconomicboardAdministratorArticle_viewsController } from "./controllers/economicBoard/administrator/article-views/EconomicboardAdministratorArticle_viewsController";
import { EconomicboardAdministratorArticlesController } from "./controllers/economicBoard/administrator/articles/EconomicboardAdministratorArticlesController";
import { EconomicboardAdministratorArticlesCommentsController } from "./controllers/economicBoard/administrator/articles/comments/EconomicboardAdministratorArticlesCommentsController";
import { EconomicboardAdministratorBanned_usersController } from "./controllers/economicBoard/administrator/banned-users/EconomicboardAdministratorBanned_usersController";
import { EconomicboardAdministratorCommentsController } from "./controllers/economicBoard/administrator/comments/EconomicboardAdministratorCommentsController";
import { EconomicboardAdministratorReportsActivityController } from "./controllers/economicBoard/administrator/reports/activity/EconomicboardAdministratorReportsActivityController";
import { EconomicboardAdministratorSectionsController } from "./controllers/economicBoard/administrator/sections/EconomicboardAdministratorSectionsController";
import { EconomicboardAdministratorSectionsSnapshotsController } from "./controllers/economicBoard/administrator/sections/snapshots/EconomicboardAdministratorSectionsSnapshotsController";
import { EconomicboardAdministratorUsersController } from "./controllers/economicBoard/administrator/users/ban/EconomicboardAdministratorUsersController";
import { EconomicboardArticle_snapshotsController } from "./controllers/economicBoard/article-snapshots/EconomicboardArticle_snapshotsController";
import { EconomicboardArticle_snapshotsAttachmentsController } from "./controllers/economicBoard/article-snapshots/attachments/EconomicboardArticle_snapshotsAttachmentsController";
import { EconomicboardArticle_snapshotsTagsController } from "./controllers/economicBoard/article-snapshots/tags/EconomicboardArticle_snapshotsTagsController";
import { EconomicboardArticlesController } from "./controllers/economicBoard/articles/EconomicboardArticlesController";
import { EconomicboardArticlesAttachmentsController } from "./controllers/economicBoard/articles/attachments/EconomicboardArticlesAttachmentsController";
import { EconomicboardArticlesCommentsController } from "./controllers/economicBoard/articles/comments/EconomicboardArticlesCommentsController";
import { EconomicboardArticlesSnapshotsController } from "./controllers/economicBoard/articles/snapshots/EconomicboardArticlesSnapshotsController";
import { EconomicboardAuthAdministratorController } from "./controllers/economicBoard/auth/administrator/EconomicboardAuthAdministratorController";
import { EconomicboardAuthCitizenController } from "./controllers/economicBoard/auth/citizen/EconomicboardAuthCitizenController";
import { EconomicboardAuthSuperadministratorController } from "./controllers/economicBoard/auth/superAdministrator/EconomicboardAuthSuperadministratorController";
import { EconomicboardCitizenController } from "./controllers/economicBoard/citizen/EconomicboardCitizenController";
import { EconomicboardCitizenArticlesController } from "./controllers/economicBoard/citizen/articles/EconomicboardCitizenArticlesController";
import { EconomicboardCitizenArticlesCommentsController } from "./controllers/economicBoard/citizen/articles/comments/EconomicboardCitizenArticlesCommentsController";
import { EconomicboardCitizenCommentsController } from "./controllers/economicBoard/citizen/comments/EconomicboardCitizenCommentsController";
import { EconomicboardCitizenReportsActivityController } from "./controllers/economicBoard/citizen/reports/activity/EconomicboardCitizenReportsActivityController";
import { EconomicboardCitizenSearchesController } from "./controllers/economicBoard/citizen/searches/EconomicboardCitizenSearchesController";
import { EconomicboardSection_snapshotsController } from "./controllers/economicBoard/section-snapshots/EconomicboardSection_snapshotsController";
import { EconomicboardSectionsController } from "./controllers/economicBoard/sections/EconomicboardSectionsController";
import { EconomicboardSuperadministratorAdminAdmin_requestsController } from "./controllers/economicBoard/superAdministrator/admin/admin-requests/EconomicboardSuperadministratorAdminAdmin_requestsController";
import { EconomicboardSuperadministratorAdminAudit_logsController } from "./controllers/economicBoard/superAdministrator/admin/audit-logs/EconomicboardSuperadministratorAdminAudit_logsController";
import { EconomicboardSuperadministratorAdminUsersController } from "./controllers/economicBoard/superAdministrator/admin/users/demote/EconomicboardSuperadministratorAdminUsersController";
import { EconomicboardSuperadministratorAdminUsersPromote_adminController } from "./controllers/economicBoard/superAdministrator/admin/users/promote-admin/EconomicboardSuperadministratorAdminUsersPromote_adminController";
import { EconomicboardSuperadministratorAdminUsersPromoteController } from "./controllers/economicBoard/superAdministrator/admin/users/promote/EconomicboardSuperadministratorAdminUsersPromoteController";
import { EconomicboardSuperadministratorBanned_usersController } from "./controllers/economicBoard/superAdministrator/banned-users/EconomicboardSuperadministratorBanned_usersController";
import { EconomicboardSuperadministratorRequestsController } from "./controllers/economicBoard/superAdministrator/requests/EconomicboardSuperadministratorRequestsController";
import { EconomicboardSuperadministratorUsersController } from "./controllers/economicBoard/superAdministrator/users/demote/EconomicboardSuperadministratorUsersController";
import { EconomicboardTagsController } from "./controllers/economicBoard/tags/EconomicboardTagsController";
import { EconomicboardUsersController } from "./controllers/economicBoard/users/EconomicboardUsersController";

@Module({
  controllers: [
    EconomicboardAuthCitizenController,
    EconomicboardAuthAdministratorController,
    EconomicboardAuthSuperadministratorController,
    EconomicboardCitizenController,
    EconomicboardSuperadministratorAdminAudit_logsController,
    EconomicboardArticlesController,
    EconomicboardCitizenArticlesController,
    EconomicboardAdministratorArticlesController,
    EconomicboardArticlesCommentsController,
    EconomicboardCitizenArticlesCommentsController,
    EconomicboardAdministratorArticlesCommentsController,
    EconomicboardSectionsController,
    EconomicboardAdministratorSectionsController,
    EconomicboardTagsController,
    EconomicboardArticlesAttachmentsController,
    EconomicboardArticlesSnapshotsController,
    EconomicboardArticle_snapshotsController,
    EconomicboardArticle_snapshotsAttachmentsController,
    EconomicboardArticle_snapshotsTagsController,
    EconomicboardAdministratorSectionsSnapshotsController,
    EconomicboardSection_snapshotsController,
    EconomicboardAdministratorArticle_viewsController,
    EconomicboardAdministratorAdminUsersController,
    EconomicboardAdministratorAdminUsers_unbanController,
    EconomicboardSuperadministratorAdminAdmin_requestsController,
    EconomicboardSuperadministratorRequestsController,
    EconomicboardUsersController,
    EconomicboardCitizenCommentsController,
    EconomicboardAdministratorCommentsController,
    EconomicboardSuperadministratorAdminUsersPromote_adminController,
    EconomicboardSuperadministratorUsersController,
    EconomicboardAdministratorBanned_usersController,
    EconomicboardSuperadministratorBanned_usersController,
    EconomicboardSuperadministratorAdminUsersPromoteController,
    EconomicboardSuperadministratorAdminUsersController,
    EconomicboardAdministratorAdminBanned_usersController,
    EconomicboardCitizenSearchesController,
    EconomicboardCitizenReportsActivityController,
    EconomicboardAdministratorReportsActivityController,
    EconomicboardAdministratorAnalyticsController,
    EconomicboardAdministratorUsersController,
  ],
})
export class MyModule {}
