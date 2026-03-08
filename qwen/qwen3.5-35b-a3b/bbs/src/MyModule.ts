import { Module } from "@nestjs/common";

import { EconomicpoliticalboardAdminAdministrator_requestsController } from "./controllers/economicPoliticalBoard/admin/administrator-requests/EconomicpoliticalboardAdminAdministrator_requestsController";
import { EconomicpoliticalboardAdminAdministrator_rolesController } from "./controllers/economicPoliticalBoard/admin/administrator-roles/EconomicpoliticalboardAdminAdministrator_rolesController";
import { EconomicpoliticalboardAdminAdministratorsController } from "./controllers/economicPoliticalBoard/admin/administrators/EconomicpoliticalboardAdminAdministratorsController";
import { EconomicpoliticalboardAdminArticlesCommentsController } from "./controllers/economicPoliticalBoard/admin/articles/comments/EconomicpoliticalboardAdminArticlesCommentsController";
import { EconomicpoliticalboardAdminBan_recordsController } from "./controllers/economicPoliticalBoard/admin/ban-records/EconomicpoliticalboardAdminBan_recordsController";
import { EconomicpoliticalboardAdminBanned_usersController } from "./controllers/economicPoliticalBoard/admin/banned-users/EconomicpoliticalboardAdminBanned_usersController";
import { EconomicpoliticalboardAdminPending_requestsController } from "./controllers/economicPoliticalBoard/admin/pending-requests/EconomicpoliticalboardAdminPending_requestsController";
import { EconomicpoliticalboardAdminSectionsController } from "./controllers/economicPoliticalBoard/admin/sections/EconomicpoliticalboardAdminSectionsController";
import { EconomicpoliticalboardAuthAdminController } from "./controllers/economicPoliticalBoard/auth/admin/EconomicpoliticalboardAuthAdminController";
import { EconomicpoliticalboardAuthGuestController } from "./controllers/economicPoliticalBoard/auth/guest/EconomicpoliticalboardAuthGuestController";
import { EconomicpoliticalboardAuthMemberController } from "./controllers/economicPoliticalBoard/auth/member/EconomicpoliticalboardAuthMemberController";
import { EconomicpoliticalboardGuestArticlesController } from "./controllers/economicPoliticalBoard/guest/articles/EconomicpoliticalboardGuestArticlesController";
import { EconomicpoliticalboardGuestArticlesAttachmentsController } from "./controllers/economicPoliticalBoard/guest/articles/attachments/EconomicpoliticalboardGuestArticlesAttachmentsController";
import { EconomicpoliticalboardGuestArticlesCommentsController } from "./controllers/economicPoliticalBoard/guest/articles/comments/EconomicpoliticalboardGuestArticlesCommentsController";
import { EconomicpoliticalboardMemberArticlesController } from "./controllers/economicPoliticalBoard/member/articles/EconomicpoliticalboardMemberArticlesController";
import { EconomicpoliticalboardMemberArticlesAttachmentsController } from "./controllers/economicPoliticalBoard/member/articles/attachments/EconomicpoliticalboardMemberArticlesAttachmentsController";
import { EconomicpoliticalboardMemberArticlesCommentsController } from "./controllers/economicPoliticalBoard/member/articles/comments/EconomicpoliticalboardMemberArticlesCommentsController";
import { EconomicpoliticalboardSectionsTagsController } from "./controllers/economicPoliticalBoard/sections/tags/EconomicpoliticalboardSectionsTagsController";
import { EconomicpoliticalboardTagsController } from "./controllers/economicPoliticalBoard/tags/EconomicpoliticalboardTagsController";
import { EconomicpoliticalboardTagsArticlesController } from "./controllers/economicPoliticalBoard/tags/articles/EconomicpoliticalboardTagsArticlesController";

@Module({
  controllers: [
    EconomicpoliticalboardAuthGuestController,
    EconomicpoliticalboardAuthMemberController,
    EconomicpoliticalboardAuthAdminController,
    EconomicpoliticalboardAdminSectionsController,
    EconomicpoliticalboardAdminAdministrator_requestsController,
    EconomicpoliticalboardAdminAdministrator_rolesController,
    EconomicpoliticalboardGuestArticlesController,
    EconomicpoliticalboardMemberArticlesController,
    EconomicpoliticalboardGuestArticlesAttachmentsController,
    EconomicpoliticalboardMemberArticlesAttachmentsController,
    EconomicpoliticalboardGuestArticlesCommentsController,
    EconomicpoliticalboardMemberArticlesCommentsController,
    EconomicpoliticalboardAdminArticlesCommentsController,
    EconomicpoliticalboardTagsController,
    EconomicpoliticalboardAdminBan_recordsController,
    EconomicpoliticalboardAdminPending_requestsController,
    EconomicpoliticalboardAdminAdministratorsController,
    EconomicpoliticalboardAdminBanned_usersController,
    EconomicpoliticalboardTagsArticlesController,
    EconomicpoliticalboardSectionsTagsController,
  ],
})
export class MyModule {}
