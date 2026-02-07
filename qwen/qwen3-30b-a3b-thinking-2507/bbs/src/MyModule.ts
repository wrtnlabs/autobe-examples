import { Module } from "@nestjs/common";

import { EconomypoliticsboardAdminAdministrator_requestsController } from "./controllers/economyPoliticsBoard/admin/administrator-requests/EconomypoliticsboardAdminAdministrator_requestsController";
import { EconomypoliticsboardAdminArticlesController } from "./controllers/economyPoliticsBoard/admin/articles/EconomypoliticsboardAdminArticlesController";
import { EconomypoliticsboardAdminSectionsController } from "./controllers/economyPoliticsBoard/admin/sections/EconomypoliticsboardAdminSectionsController";
import { EconomypoliticsboardAdminUsersBansController } from "./controllers/economyPoliticsBoard/admin/users/bans/EconomypoliticsboardAdminUsersBansController";
import { EconomypoliticsboardAdminsController } from "./controllers/economyPoliticsBoard/admins/EconomypoliticsboardAdminsController";
import { EconomypoliticsboardArticlesController } from "./controllers/economyPoliticsBoard/articles/EconomypoliticsboardArticlesController";
import { EconomypoliticsboardArticlesAttachmentsController } from "./controllers/economyPoliticsBoard/articles/attachments/EconomypoliticsboardArticlesAttachmentsController";
import { EconomypoliticsboardArticlesTagsController } from "./controllers/economyPoliticsBoard/articles/tags/EconomypoliticsboardArticlesTagsController";
import { EconomypoliticsboardAuthAdminController } from "./controllers/economyPoliticsBoard/auth/admin/EconomypoliticsboardAuthAdminController";
import { EconomypoliticsboardAuthSuperadminController } from "./controllers/economyPoliticsBoard/auth/superAdmin/EconomypoliticsboardAuthSuperadminController";
import { EconomypoliticsboardAuthUserController } from "./controllers/economyPoliticsBoard/auth/user/EconomypoliticsboardAuthUserController";
import { EconomypoliticsboardSectionsController } from "./controllers/economyPoliticsBoard/sections/EconomypoliticsboardSectionsController";
import { EconomypoliticsboardSuperadminsController } from "./controllers/economyPoliticsBoard/superadmins/EconomypoliticsboardSuperadminsController";
import { EconomypoliticsboardUserAdministrator_requestsController } from "./controllers/economyPoliticsBoard/user/administrator-requests/EconomypoliticsboardUserAdministrator_requestsController";
import { EconomypoliticsboardUserArticlesController } from "./controllers/economyPoliticsBoard/user/articles/EconomypoliticsboardUserArticlesController";
import { EconomypoliticsboardUserBansController } from "./controllers/economyPoliticsBoard/user/bans/EconomypoliticsboardUserBansController";
import { EconomypoliticsboardUserFiltersController } from "./controllers/economyPoliticsBoard/user/filters/EconomypoliticsboardUserFiltersController";
import { EconomypoliticsboardUserProfileController } from "./controllers/economyPoliticsBoard/user/profile/EconomypoliticsboardUserProfileController";
import { EconomypoliticsboardUserQueriesController } from "./controllers/economyPoliticsBoard/user/queries/EconomypoliticsboardUserQueriesController";
import { EconomypoliticsboardUserResultsController } from "./controllers/economyPoliticsBoard/user/results/EconomypoliticsboardUserResultsController";
import { EconomypoliticsboardUserSearchController } from "./controllers/economyPoliticsBoard/user/search/EconomypoliticsboardUserSearchController";
import { EconomypoliticsboardUserSessionsController } from "./controllers/economyPoliticsBoard/user/sessions/EconomypoliticsboardUserSessionsController";
import { EconomypoliticsboardUsersController } from "./controllers/economyPoliticsBoard/users/EconomypoliticsboardUsersController";

@Module({
  controllers: [
    EconomypoliticsboardAuthUserController,
    EconomypoliticsboardAuthAdminController,
    EconomypoliticsboardAuthSuperadminController,
    EconomypoliticsboardUsersController,
    EconomypoliticsboardUserProfileController,
    EconomypoliticsboardUserSessionsController,
    EconomypoliticsboardAdminsController,
    EconomypoliticsboardSuperadminsController,
    EconomypoliticsboardSectionsController,
    EconomypoliticsboardAdminSectionsController,
    EconomypoliticsboardArticlesController,
    EconomypoliticsboardUserArticlesController,
    EconomypoliticsboardAdminArticlesController,
    EconomypoliticsboardArticlesAttachmentsController,
    EconomypoliticsboardArticlesTagsController,
    EconomypoliticsboardAdminAdministrator_requestsController,
    EconomypoliticsboardAdminUsersBansController,
    EconomypoliticsboardUserBansController,
    EconomypoliticsboardUserAdministrator_requestsController,
    EconomypoliticsboardUserFiltersController,
    EconomypoliticsboardUserQueriesController,
    EconomypoliticsboardUserResultsController,
    EconomypoliticsboardUserSearchController,
  ],
})
export class MyModule {}
