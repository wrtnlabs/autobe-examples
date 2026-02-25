import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdmin_sessionsController } from "./controllers/discussionBoard/admin/admin-sessions/DiscussionboardAdminAdmin_sessionsController";
import { DiscussionboardAdminAdminSessionsController } from "./controllers/discussionBoard/admin/admin/sessions/DiscussionboardAdminAdminSessionsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesFilesDownloadController } from "./controllers/discussionBoard/admin/articles/files/download/DiscussionboardAdminArticlesFilesDownloadController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSessionsController } from "./controllers/discussionBoard/admin/sessions/DiscussionboardAdminSessionsController";
import { DiscussionboardAdminUsersController } from "./controllers/discussionBoard/admin/users/ban/DiscussionboardAdminUsersController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesFilesController } from "./controllers/discussionBoard/articles/files/DiscussionboardArticlesFilesController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardAuthSuperadminController } from "./controllers/discussionBoard/auth/superAdmin/DiscussionboardAuthSuperadminController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardGuestSessionsController } from "./controllers/discussionBoard/guest/sessions/DiscussionboardGuestSessionsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardMemberCommentsController } from "./controllers/discussionBoard/member/comments/DiscussionboardMemberCommentsController";
import { DiscussionboardMemberMemberSessionsController } from "./controllers/discussionBoard/member/member/sessions/DiscussionboardMemberMemberSessionsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardController } from "./controllers/discussionBoard/search/DiscussionboardController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSuperadminAdmin_sessionsController } from "./controllers/discussionBoard/superAdmin/admin-sessions/DiscussionboardSuperadminAdmin_sessionsController";
import { DiscussionboardSuperadminAdminsController } from "./controllers/discussionBoard/superAdmin/admins/DiscussionboardSuperadminAdminsController";
import { DiscussionboardSuperadminArticlesController } from "./controllers/discussionBoard/superAdmin/articles/DiscussionboardSuperadminArticlesController";
import { DiscussionboardSuperadminBansController } from "./controllers/discussionBoard/superAdmin/bans/DiscussionboardSuperadminBansController";
import { DiscussionboardSuperadminCommentsController } from "./controllers/discussionBoard/superAdmin/comments/DiscussionboardSuperadminCommentsController";
import { DiscussionboardSuperadminSectionsController } from "./controllers/discussionBoard/superAdmin/sections/DiscussionboardSuperadminSectionsController";
import { DiscussionboardSuperadminSessionsController } from "./controllers/discussionBoard/superAdmin/sessions/DiscussionboardSuperadminSessionsController";
import { DiscussionboardSuperadminSuper_admin_sessionsController } from "./controllers/discussionBoard/superAdmin/super-admin-sessions/DiscussionboardSuperadminSuper_admin_sessionsController";
import { DiscussionboardSuperadminSuper_adminsController } from "./controllers/discussionBoard/superAdmin/super-admins/DiscussionboardSuperadminSuper_adminsController";
import { DiscussionboardSuperadminSuperadminSessionsController } from "./controllers/discussionBoard/superAdmin/superAdmin/sessions/DiscussionboardSuperadminSuperadminSessionsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuperadminController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardGuestsController,
    DiscussionboardGuestSessionsController,
    DiscussionboardMemberSessionsController,
    DiscussionboardMemberMemberSessionsController,
    DiscussionboardAdminSessionsController,
    DiscussionboardAdminAdminSessionsController,
    DiscussionboardSuperadminSessionsController,
    DiscussionboardSuperadminSuperadminSessionsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardSuperadminSectionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardSuperadminArticlesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardMemberCommentsController,
    DiscussionboardAdminCommentsController,
    DiscussionboardSuperadminCommentsController,
    DiscussionboardCommentsController,
    DiscussionboardTagsController,
    DiscussionboardArticlesFilesController,
    DiscussionboardArticlesImagesController,
    DiscussionboardSuperadminAdminsController,
    DiscussionboardSuperadminSuper_adminsController,
    DiscussionboardAdminAdmin_sessionsController,
    DiscussionboardSuperadminAdmin_sessionsController,
    DiscussionboardSuperadminSuper_admin_sessionsController,
    DiscussionboardAdminUsersController,
    DiscussionboardAdminBansController,
    DiscussionboardController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardAdminArticlesFilesDownloadController,
    DiscussionboardSuperadminBansController,
  ],
})
export class MyModule {}
