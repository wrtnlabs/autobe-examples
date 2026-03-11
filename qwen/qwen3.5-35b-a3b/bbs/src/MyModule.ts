import { Module } from "@nestjs/common";

import { EconomicpoliticalboardAdminArticlesController } from "./controllers/economicPoliticalBoard/admin/articles/EconomicpoliticalboardAdminArticlesController";
import { EconomicpoliticalboardAdminArticlesAttachmentsController } from "./controllers/economicPoliticalBoard/admin/articles/attachments/EconomicpoliticalboardAdminArticlesAttachmentsController";
import { EconomicpoliticalboardAdminArticlesCommentsController } from "./controllers/economicPoliticalBoard/admin/articles/comments/EconomicpoliticalboardAdminArticlesCommentsController";
import { EconomicpoliticalboardAdminBan_recordsController } from "./controllers/economicPoliticalBoard/admin/ban-records/EconomicpoliticalboardAdminBan_recordsController";
import { EconomicpoliticalboardAdminBansController } from "./controllers/economicPoliticalBoard/admin/bans/EconomicpoliticalboardAdminBansController";
import { EconomicpoliticalboardAdminRequestsController } from "./controllers/economicPoliticalBoard/admin/requests/EconomicpoliticalboardAdminRequestsController";
import { EconomicpoliticalboardAdminRolesController } from "./controllers/economicPoliticalBoard/admin/roles/EconomicpoliticalboardAdminRolesController";
import { EconomicpoliticalboardAdminSectionsController } from "./controllers/economicPoliticalBoard/admin/sections/EconomicpoliticalboardAdminSectionsController";
import { EconomicpoliticalboardArticlesController } from "./controllers/economicPoliticalBoard/articles/EconomicpoliticalboardArticlesController";
import { EconomicpoliticalboardArticlesCommentsController } from "./controllers/economicPoliticalBoard/articles/comments/EconomicpoliticalboardArticlesCommentsController";
import { EconomicpoliticalboardAuthAdminController } from "./controllers/economicPoliticalBoard/auth/admin/EconomicpoliticalboardAuthAdminController";
import { EconomicpoliticalboardAuthGuestController } from "./controllers/economicPoliticalBoard/auth/guest/EconomicpoliticalboardAuthGuestController";
import { EconomicpoliticalboardAuthMemberController } from "./controllers/economicPoliticalBoard/auth/member/EconomicpoliticalboardAuthMemberController";
import { EconomicpoliticalboardGuestArticlesTagsController } from "./controllers/economicPoliticalBoard/guest/articles/tags/EconomicpoliticalboardGuestArticlesTagsController";
import { EconomicpoliticalboardGuestSectionsController } from "./controllers/economicPoliticalBoard/guest/sections/EconomicpoliticalboardGuestSectionsController";
import { EconomicpoliticalboardGuestSectionsPopular_tagsController } from "./controllers/economicPoliticalBoard/guest/sections/popular-tags/EconomicpoliticalboardGuestSectionsPopular_tagsController";
import { EconomicpoliticalboardMemberArticlesController } from "./controllers/economicPoliticalBoard/member/articles/EconomicpoliticalboardMemberArticlesController";
import { EconomicpoliticalboardMemberArticlesAttachmentsController } from "./controllers/economicPoliticalBoard/member/articles/attachments/EconomicpoliticalboardMemberArticlesAttachmentsController";
import { EconomicpoliticalboardMemberArticlesCommentsController } from "./controllers/economicPoliticalBoard/member/articles/comments/EconomicpoliticalboardMemberArticlesCommentsController";
import { EconomicpoliticalboardMemberArticlesTagsController } from "./controllers/economicPoliticalBoard/member/articles/tags/EconomicpoliticalboardMemberArticlesTagsController";
import { EconomicpoliticalboardMemberSectionsPopular_tagsController } from "./controllers/economicPoliticalBoard/member/sections/popular-tags/EconomicpoliticalboardMemberSectionsPopular_tagsController";
import { EconomicpoliticalboardTagsController } from "./controllers/economicPoliticalBoard/tags/EconomicpoliticalboardTagsController";

@Module({
  controllers: [
    EconomicpoliticalboardAuthGuestController,
    EconomicpoliticalboardAuthMemberController,
    EconomicpoliticalboardAuthAdminController,
    EconomicpoliticalboardGuestSectionsController,
    EconomicpoliticalboardAdminSectionsController,
    EconomicpoliticalboardAdminArticlesController,
    EconomicpoliticalboardMemberArticlesController,
    EconomicpoliticalboardArticlesController,
    EconomicpoliticalboardTagsController,
    EconomicpoliticalboardAdminArticlesAttachmentsController,
    EconomicpoliticalboardMemberArticlesAttachmentsController,
    EconomicpoliticalboardArticlesCommentsController,
    EconomicpoliticalboardMemberArticlesCommentsController,
    EconomicpoliticalboardAdminArticlesCommentsController,
    EconomicpoliticalboardAdminRolesController,
    EconomicpoliticalboardAdminRequestsController,
    EconomicpoliticalboardAdminBan_recordsController,
    EconomicpoliticalboardAdminBansController,
    EconomicpoliticalboardGuestArticlesTagsController,
    EconomicpoliticalboardMemberArticlesTagsController,
    EconomicpoliticalboardGuestSectionsPopular_tagsController,
    EconomicpoliticalboardMemberSectionsPopular_tagsController,
  ],
})
export class MyModule {}
