import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdmin_requestsController } from "./controllers/discussionBoard/admin/admin-requests/DiscussionboardAdminAdmin_requestsController";
import { DiscussionboardAdminAdmin_requestsHistoriesController } from "./controllers/discussionBoard/admin/admin-requests/histories/DiscussionboardAdminAdmin_requestsHistoriesController";
import { DiscussionboardAdminAdmin_requestsPendingController } from "./controllers/discussionBoard/admin/admin-requests/pending/DiscussionboardAdminAdmin_requestsPendingController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminAdminsGradeController } from "./controllers/discussionBoard/admin/admins/grade/DiscussionboardAdminAdminsGradeController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/admin/articles/comments/snapshots/DiscussionboardAdminArticlesCommentsSnapshotsController";
import { DiscussionboardAdminArticlesFilesController } from "./controllers/discussionBoard/admin/articles/files/DiscussionboardAdminArticlesFilesController";
import { DiscussionboardAdminArticlesImagesController } from "./controllers/discussionBoard/admin/articles/images/DiscussionboardAdminArticlesImagesController";
import { DiscussionboardAdminArticlesSnapshotsController } from "./controllers/discussionBoard/admin/articles/snapshots/DiscussionboardAdminArticlesSnapshotsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminBan_historiesController } from "./controllers/discussionBoard/admin/ban-histories/DiscussionboardAdminBan_historiesController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminMembersController } from "./controllers/discussionBoard/admin/members/DiscussionboardAdminMembersController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsSnapshotsController } from "./controllers/discussionBoard/admin/sections/snapshots/DiscussionboardAdminSectionsSnapshotsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesFilesController } from "./controllers/discussionBoard/articles/files/DiscussionboardArticlesFilesController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardGuestArticlesController } from "./controllers/discussionBoard/guest/articles/search/DiscussionboardGuestArticlesController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardMemberArticlesImagesController } from "./controllers/discussionBoard/member/articles/images/DiscussionboardMemberArticlesImagesController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardMembersArticlesController } from "./controllers/discussionBoard/members/articles/DiscussionboardMembersArticlesController";
import { DiscussionboardMembersCommentsController } from "./controllers/discussionBoard/members/comments/DiscussionboardMembersCommentsController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSectionsArticlesController } from "./controllers/discussionBoard/sections/articles/DiscussionboardSectionsArticlesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardAdminMembersController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardAdminAdminsController,
    DiscussionboardMemberSessionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardMembersArticlesController,
    DiscussionboardMembersCommentsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardAdminSectionsSnapshotsController,
    DiscussionboardSectionsArticlesController,
    DiscussionboardArticlesFilesController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardAdminArticlesFilesController,
    DiscussionboardArticlesImagesController,
    DiscussionboardMemberArticlesImagesController,
    DiscussionboardAdminArticlesImagesController,
    DiscussionboardTagsController,
    DiscussionboardAdminArticlesSnapshotsController,
    DiscussionboardAdminArticlesCommentsSnapshotsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardAdminAdmin_requestsController,
    DiscussionboardAdminAdmin_requestsHistoriesController,
    DiscussionboardAdminAdminsGradeController,
    DiscussionboardAdminBansController,
    DiscussionboardAdminBan_historiesController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardGuestArticlesController,
    DiscussionboardAdminAdmin_requestsPendingController,
  ],
})
export class MyModule {}
