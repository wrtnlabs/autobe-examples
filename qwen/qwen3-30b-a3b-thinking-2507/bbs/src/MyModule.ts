import { Module } from "@nestjs/common";

import { EconpoliticboardAdminArticlesController } from "./controllers/econPoliticBoard/admin/articles/EconpoliticboardAdminArticlesController";
import { EconpoliticboardAdminArticlesAttachmentsController } from "./controllers/econPoliticBoard/admin/articles/attachments/EconpoliticboardAdminArticlesAttachmentsController";
import { EconpoliticboardAdminArticlesTagsController } from "./controllers/econPoliticBoard/admin/articles/tags/EconpoliticboardAdminArticlesTagsController";
import { EconpoliticboardAdminArticlesVersionsController } from "./controllers/econPoliticBoard/admin/articles/versions/EconpoliticboardAdminArticlesVersionsController";
import { EconpoliticboardAdmin_exportController } from "./controllers/econPoliticBoard/admin/export/EconpoliticboardAdmin_exportController";
import { EconpoliticboardAdminProfilesController } from "./controllers/econPoliticBoard/admin/profiles/EconpoliticboardAdminProfilesController";
import { EconpoliticboardAdminRequestsController } from "./controllers/econPoliticBoard/admin/requests/EconpoliticboardAdminRequestsController";
import { EconpoliticboardAdminSectionsController } from "./controllers/econPoliticBoard/admin/sections/EconpoliticboardAdminSectionsController";
import { EconpoliticboardAdminStatisticsController } from "./controllers/econPoliticBoard/admin/statistics/EconpoliticboardAdminStatisticsController";
import { EconpoliticboardAdminSystemconfigsController } from "./controllers/econPoliticBoard/admin/systemConfigs/EconpoliticboardAdminSystemconfigsController";
import { EconpoliticboardAdminSystemconfigsMaintenanceController } from "./controllers/econPoliticBoard/admin/systemConfigs/maintenance/EconpoliticboardAdminSystemconfigsMaintenanceController";
import { EconpoliticboardAdminsController } from "./controllers/econPoliticBoard/admins/EconpoliticboardAdminsController";
import { EconpoliticboardArticlesController } from "./controllers/econPoliticBoard/articles/EconpoliticboardArticlesController";
import { EconpoliticboardArticlesAttachmentsController } from "./controllers/econPoliticBoard/articles/attachments/EconpoliticboardArticlesAttachmentsController";
import { EconpoliticboardArticlesTagsController } from "./controllers/econPoliticBoard/articles/tags/EconpoliticboardArticlesTagsController";
import { EconpoliticboardArticlesVersionsController } from "./controllers/econPoliticBoard/articles/versions/EconpoliticboardArticlesVersionsController";
import { EconpoliticboardAuthAdminController } from "./controllers/econPoliticBoard/auth/admin/EconpoliticboardAuthAdminController";
import { EconpoliticboardAuthGuestController } from "./controllers/econPoliticBoard/auth/guest/EconpoliticboardAuthGuestController";
import { EconpoliticboardAuthMemberJoinController } from "./controllers/econPoliticBoard/auth/member/join/EconpoliticboardAuthMemberJoinController";
import { EconpoliticboardAuthMemberLoginController } from "./controllers/econPoliticBoard/auth/member/login/EconpoliticboardAuthMemberLoginController";
import { EconpoliticboardAuthMemberRefreshController } from "./controllers/econPoliticBoard/auth/member/refresh/EconpoliticboardAuthMemberRefreshController";
import { EconpoliticboardGuestsController } from "./controllers/econPoliticBoard/guests/EconpoliticboardGuestsController";
import { EconpoliticboardMemberArticlesController } from "./controllers/econPoliticBoard/member/articles/EconpoliticboardMemberArticlesController";
import { EconpoliticboardMemberArticlesAttachmentsController } from "./controllers/econPoliticBoard/member/articles/attachments/EconpoliticboardMemberArticlesAttachmentsController";
import { EconpoliticboardMemberArticlesTagsController } from "./controllers/econPoliticBoard/member/articles/tags/EconpoliticboardMemberArticlesTagsController";
import { EconpoliticboardMemberArticlesVersionsController } from "./controllers/econPoliticBoard/member/articles/versions/EconpoliticboardMemberArticlesVersionsController";
import { EconpoliticboardMemberProfileController } from "./controllers/econPoliticBoard/member/profile/EconpoliticboardMemberProfileController";
import { EconpoliticboardMemberProfilesController } from "./controllers/econPoliticBoard/member/profiles/EconpoliticboardMemberProfilesController";
import { EconpoliticboardMemberSearchController } from "./controllers/econPoliticBoard/member/search/EconpoliticboardMemberSearchController";
import { EconpoliticboardMemberSessionsController } from "./controllers/econPoliticBoard/member/sessions/EconpoliticboardMemberSessionsController";
import { EconpoliticboardMembersController } from "./controllers/econPoliticBoard/members/EconpoliticboardMembersController";
import { EconpoliticboardSectionsController } from "./controllers/econPoliticBoard/sections/EconpoliticboardSectionsController";

@Module({
  controllers: [
    EconpoliticboardAuthGuestController,
    EconpoliticboardAuthMemberJoinController,
    EconpoliticboardAuthMemberLoginController,
    EconpoliticboardAuthMemberRefreshController,
    EconpoliticboardAuthAdminController,
    EconpoliticboardGuestsController,
    EconpoliticboardMembersController,
    EconpoliticboardMemberSessionsController,
    EconpoliticboardAdminsController,
    EconpoliticboardMemberProfileController,
    EconpoliticboardArticlesAttachmentsController,
    EconpoliticboardArticlesTagsController,
    EconpoliticboardArticlesVersionsController,
    EconpoliticboardMemberArticlesController,
    EconpoliticboardAdminArticlesController,
    EconpoliticboardArticlesController,
    EconpoliticboardMemberArticlesAttachmentsController,
    EconpoliticboardAdminArticlesAttachmentsController,
    EconpoliticboardMemberArticlesTagsController,
    EconpoliticboardAdminArticlesTagsController,
    EconpoliticboardMemberArticlesVersionsController,
    EconpoliticboardAdminArticlesVersionsController,
    EconpoliticboardAdminRequestsController,
    EconpoliticboardMemberProfilesController,
    EconpoliticboardAdminProfilesController,
    EconpoliticboardSectionsController,
    EconpoliticboardAdminSectionsController,
    EconpoliticboardAdminSystemconfigsController,
    EconpoliticboardAdminStatisticsController,
    EconpoliticboardMemberSearchController,
    EconpoliticboardAdmin_exportController,
    EconpoliticboardAdminSystemconfigsMaintenanceController,
  ],
})
export class MyModule {}
