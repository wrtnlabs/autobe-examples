import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdmin_requestsController } from "./controllers/discussionBoard/admin/admin-requests/DiscussionboardAdminAdmin_requestsController";
import { DiscussionboardAdminAdmin_requestsPendingController } from "./controllers/discussionBoard/admin/admin-requests/pending/DiscussionboardAdminAdmin_requestsPendingController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/admin/articles/comments/snapshots/DiscussionboardAdminArticlesCommentsSnapshotsController";
import { DiscussionboardAdminArticlesSnapshotsController } from "./controllers/discussionBoard/admin/articles/snapshots/DiscussionboardAdminArticlesSnapshotsController";
import { DiscussionboardAdminBan_recordsController } from "./controllers/discussionBoard/admin/ban-records/DiscussionboardAdminBan_recordsController";
import { DiscussionboardAdminBan_recordsActiveController } from "./controllers/discussionBoard/admin/ban-records/active/DiscussionboardAdminBan_recordsActiveController";
import { DiscussionboardAdminMembersController } from "./controllers/discussionBoard/admin/members/ban/DiscussionboardAdminMembersController";
import { DiscussionboardAdminProfileController } from "./controllers/discussionBoard/admin/profile/DiscussionboardAdminProfileController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsSnapshotsController } from "./controllers/discussionBoard/admin/sections/snapshots/DiscussionboardAdminSectionsSnapshotsController";
import { DiscussionboardAdminTagsController } from "./controllers/discussionBoard/admin/tags/DiscussionboardAdminTagsController";
import { DiscussionboardAdminsController } from "./controllers/discussionBoard/admins/DiscussionboardAdminsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/join/DiscussionboardAuthMemberController";
import { DiscussionboardAuthMemberLoginController } from "./controllers/discussionBoard/auth/member/login/DiscussionboardAuthMemberLoginController";
import { DiscussionboardAuthMemberRefreshController } from "./controllers/discussionBoard/auth/member/refresh/DiscussionboardAuthMemberRefreshController";
import { DiscussionboardGuestSectionsController } from "./controllers/discussionBoard/guest/sections/DiscussionboardGuestSectionsController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberEmail_verificationsController } from "./controllers/discussionBoard/member/email-verifications/DiscussionboardMemberEmail_verificationsController";
import { DiscussionboardMemberPassword_resetsController } from "./controllers/discussionBoard/member/password-resets/DiscussionboardMemberPassword_resetsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSectionsController } from "./controllers/discussionBoard/member/sections/DiscussionboardMemberSectionsController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSectionsArticlesController } from "./controllers/discussionBoard/sections/articles/DiscussionboardSectionsArticlesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthMemberLoginController,
    DiscussionboardAuthMemberRefreshController,
    DiscussionboardAuthAdminController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardMemberSessionsController,
    DiscussionboardMemberPassword_resetsController,
    DiscussionboardMemberEmail_verificationsController,
    DiscussionboardAdminsController,
    DiscussionboardGuestSectionsController,
    DiscussionboardMemberSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardAdminSectionsSnapshotsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardTagsController,
    DiscussionboardAdminTagsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardArticlesTagsController,
    DiscussionboardAdminArticlesSnapshotsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsSnapshotsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardAdminAdmin_requestsController,
    DiscussionboardAdminBan_recordsController,
    DiscussionboardAdminProfileController,
    DiscussionboardSectionsArticlesController,
    DiscussionboardAdminMembersController,
    DiscussionboardAdminAdmin_requestsPendingController,
    DiscussionboardAdminBan_recordsActiveController,
  ],
})
export class MyModule {}
