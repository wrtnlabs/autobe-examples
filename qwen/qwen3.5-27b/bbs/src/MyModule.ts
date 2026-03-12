import { Module } from "@nestjs/common";

import { DiscussionboardAdministratorAdmin_requestsController } from "./controllers/discussionBoard/administrator/admin-requests/DiscussionboardAdministratorAdmin_requestsController";
import { DiscussionboardAdministratorAdmin_requestsDecisionsController } from "./controllers/discussionBoard/administrator/admin-requests/decisions/DiscussionboardAdministratorAdmin_requestsDecisionsController";
import { DiscussionboardAdministratorAdmin_requestsPendingController } from "./controllers/discussionBoard/administrator/admin-requests/pending/DiscussionboardAdministratorAdmin_requestsPendingController";
import { DiscussionboardAdministratorArticlesController } from "./controllers/discussionBoard/administrator/articles/DiscussionboardAdministratorArticlesController";
import { DiscussionboardAdministratorArticlesCommentsController } from "./controllers/discussionBoard/administrator/articles/comments/DiscussionboardAdministratorArticlesCommentsController";
import { DiscussionboardAdministratorArticlesViewsController } from "./controllers/discussionBoard/administrator/articles/views/DiscussionboardAdministratorArticlesViewsController";
import { DiscussionboardAdministratorBanrecordsController } from "./controllers/discussionBoard/administrator/banRecords/DiscussionboardAdministratorBanrecordsController";
import { DiscussionboardAdministratorSectionsController } from "./controllers/discussionBoard/administrator/sections/DiscussionboardAdministratorSectionsController";
import { DiscussionboardAdministratorsController } from "./controllers/discussionBoard/administrators/DiscussionboardAdministratorsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/articles/comments/snapshots/DiscussionboardArticlesCommentsSnapshotsController";
import { DiscussionboardArticlesSnapshotsController } from "./controllers/discussionBoard/articles/snapshots/DiscussionboardArticlesSnapshotsController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardAuthAdministratorController } from "./controllers/discussionBoard/auth/administrator/DiscussionboardAuthAdministratorController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardGuestSessionsController } from "./controllers/discussionBoard/guest/sessions/DiscussionboardGuestSessionsController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberPassword_resetsController } from "./controllers/discussionBoard/member/password-resets/DiscussionboardMemberPassword_resetsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberTagsController } from "./controllers/discussionBoard/member/tags/DiscussionboardMemberTagsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSectionsSnapshotsController } from "./controllers/discussionBoard/sections/snapshots/DiscussionboardSectionsSnapshotsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardTagsArticlesController } from "./controllers/discussionBoard/tags/articles/DiscussionboardTagsArticlesController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdministratorController,
    DiscussionboardGuestSessionsController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardMemberPassword_resetsController,
    DiscussionboardAdministratorsController,
    DiscussionboardSectionsController,
    DiscussionboardAdministratorSectionsController,
    DiscussionboardSectionsSnapshotsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdministratorArticlesController,
    DiscussionboardArticlesSnapshotsController,
    DiscussionboardAdministratorArticlesViewsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdministratorArticlesCommentsController,
    DiscussionboardArticlesCommentsSnapshotsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardAdministratorAdmin_requestsController,
    DiscussionboardAdministratorAdmin_requestsDecisionsController,
    DiscussionboardAdministratorBanrecordsController,
    DiscussionboardTagsController,
    DiscussionboardMemberTagsController,
    DiscussionboardArticlesTagsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardTagsArticlesController,
    DiscussionboardAdministratorAdmin_requestsPendingController,
  ],
})
export class MyModule {}
