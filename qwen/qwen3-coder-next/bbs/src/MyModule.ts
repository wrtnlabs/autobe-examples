import { Module } from "@nestjs/common";

import { DiscussionboardAdminActorsController } from "./controllers/discussionBoard/admin/actors/DiscussionboardAdminActorsController";
import { DiscussionboardAdminActorsBanController } from "./controllers/discussionBoard/admin/actors/ban/DiscussionboardAdminActorsBanController";
import { DiscussionboardAdminAdminRequestsController } from "./controllers/discussionBoard/admin/admin/requests/DiscussionboardAdminAdminRequestsController";
import { DiscussionboardAdminAnalyticsSessionsController } from "./controllers/discussionBoard/admin/analytics/sessions/DiscussionboardAdminAnalyticsSessionsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesFilesController } from "./controllers/discussionBoard/admin/articles/files/DiscussionboardAdminArticlesFilesController";
import { DiscussionboardAdminArticlesTagsController } from "./controllers/discussionBoard/admin/articles/tags/DiscussionboardAdminArticlesTagsController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminBansDetailsController } from "./controllers/discussionBoard/admin/bans/details/DiscussionboardAdminBansDetailsController";
import { DiscussionboardAdminRequestsController } from "./controllers/discussionBoard/admin/requests/DiscussionboardAdminRequestsController";
import { DiscussionboardAdminSectionsArticlesController } from "./controllers/discussionBoard/admin/sections/articles/DiscussionboardAdminSectionsArticlesController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesFilesDownloadController } from "./controllers/discussionBoard/articles/files/download/DiscussionboardArticlesFilesDownloadController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardAuthSuperadminController } from "./controllers/discussionBoard/auth/superAdmin/DiscussionboardAuthSuperadminController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberMemberActivityController } from "./controllers/discussionBoard/member/member/activity/DiscussionboardMemberMemberActivityController";
import { DiscussionboardMemberPassword_resetsController } from "./controllers/discussionBoard/member/password-resets/DiscussionboardMemberPassword_resetsController";
import { DiscussionboardMemberRequestsController } from "./controllers/discussionBoard/member/requests/DiscussionboardMemberRequestsController";
import { DiscussionboardMemberSectionsArticlesController } from "./controllers/discussionBoard/member/sections/articles/DiscussionboardMemberSectionsArticlesController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSectionsArticlesController } from "./controllers/discussionBoard/sections/articles/DiscussionboardSectionsArticlesController";
import { DiscussionboardSuperadminActorsController } from "./controllers/discussionBoard/superAdmin/actors/DiscussionboardSuperadminActorsController";
import { DiscussionboardSuperadminActorsBanController } from "./controllers/discussionBoard/superAdmin/actors/ban/DiscussionboardSuperadminActorsBanController";
import { DiscussionboardSuperadminAdminRequestsController } from "./controllers/discussionBoard/superAdmin/admin/requests/DiscussionboardSuperadminAdminRequestsController";
import { DiscussionboardSuperadminArticlesController } from "./controllers/discussionBoard/superAdmin/articles/DiscussionboardSuperadminArticlesController";
import { DiscussionboardSuperadminArticlesFilesController } from "./controllers/discussionBoard/superAdmin/articles/files/DiscussionboardSuperadminArticlesFilesController";
import { DiscussionboardSuperadminArticlesTagsController } from "./controllers/discussionBoard/superAdmin/articles/tags/DiscussionboardSuperadminArticlesTagsController";
import { DiscussionboardSuperadminBansController } from "./controllers/discussionBoard/superAdmin/bans/DiscussionboardSuperadminBansController";
import { DiscussionboardSuperadminBansDetailsController } from "./controllers/discussionBoard/superAdmin/bans/details/DiscussionboardSuperadminBansDetailsController";
import { DiscussionboardSuperadminRequestsController } from "./controllers/discussionBoard/superAdmin/requests/DiscussionboardSuperadminRequestsController";
import { DiscussionboardSuperadminRequestsPendingController } from "./controllers/discussionBoard/superAdmin/requests/pending/DiscussionboardSuperadminRequestsPendingController";
import { DiscussionboardSuperadminSectionsController } from "./controllers/discussionBoard/superAdmin/sections/DiscussionboardSuperadminSectionsController";
import { DiscussionboardSuperadminSectionsArticlesController } from "./controllers/discussionBoard/superAdmin/sections/articles/DiscussionboardSuperadminSectionsArticlesController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuperadminController,
    DiscussionboardAdminActorsController,
    DiscussionboardSuperadminActorsController,
    DiscussionboardAdminActorsBanController,
    DiscussionboardSuperadminActorsBanController,
    DiscussionboardSectionsController,
    DiscussionboardSuperadminSectionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardSuperadminArticlesController,
    DiscussionboardMemberSectionsArticlesController,
    DiscussionboardAdminSectionsArticlesController,
    DiscussionboardSuperadminSectionsArticlesController,
    DiscussionboardSectionsArticlesController,
    DiscussionboardArticlesFilesDownloadController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardAdminArticlesFilesController,
    DiscussionboardSuperadminArticlesFilesController,
    DiscussionboardArticlesTagsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardAdminArticlesTagsController,
    DiscussionboardSuperadminArticlesTagsController,
    DiscussionboardAdminAdminRequestsController,
    DiscussionboardSuperadminAdminRequestsController,
    DiscussionboardMemberRequestsController,
    DiscussionboardAdminRequestsController,
    DiscussionboardSuperadminRequestsController,
    DiscussionboardAdminBansController,
    DiscussionboardSuperadminBansController,
    DiscussionboardAdminAnalyticsSessionsController,
    DiscussionboardMemberMemberActivityController,
    DiscussionboardMemberPassword_resetsController,
    DiscussionboardSuperadminRequestsPendingController,
    DiscussionboardAdminBansDetailsController,
    DiscussionboardSuperadminBansDetailsController,
  ],
})
export class MyModule {}
