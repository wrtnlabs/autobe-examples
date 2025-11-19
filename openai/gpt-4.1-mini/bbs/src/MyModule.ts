import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminDiscussionboardguestsController } from "./controllers/discussionBoard/admin/discussionBoardGuests/DiscussionboardAdminDiscussionboardguestsController";
import { DiscussionboardDiscussionboardguestsController } from "./controllers/discussionBoard/discussionBoardGuests/DiscussionboardDiscussionboardguestsController";
import { DiscussionboardAdminDiscussionboardmembersController } from "./controllers/discussionBoard/admin/discussionBoardMembers/DiscussionboardAdminDiscussionboardmembersController";
import { DiscussionboardDiscussionboardmembersController } from "./controllers/discussionBoard/discussionBoardMembers/DiscussionboardDiscussionboardmembersController";
import { DiscussionboardMemberDiscussionboardmembersController } from "./controllers/discussionBoard/member/discussionBoardMembers/DiscussionboardMemberDiscussionboardmembersController";
import { DiscussionboardAdminDiscussionboardmembersSessionsController } from "./controllers/discussionBoard/admin/discussionBoardMembers/sessions/DiscussionboardAdminDiscussionboardmembersSessionsController";
import { DiscussionboardMemberDiscussionboardmembersSessionsController } from "./controllers/discussionBoard/member/discussionBoardMembers/sessions/DiscussionboardMemberDiscussionboardmembersSessionsController";
import { DiscussionboardAdminDiscussionboardadminsController } from "./controllers/discussionBoard/admin/discussionBoardAdmins/DiscussionboardAdminDiscussionboardadminsController";
import { DiscussionboardAdminDiscussionboardadminsSessionsController } from "./controllers/discussionBoard/admin/discussionBoardAdmins/sessions/DiscussionboardAdminDiscussionboardadminsSessionsController";
import { DiscussionboardMemberDiscussionboardarticlesController } from "./controllers/discussionBoard/member/discussionBoardArticles/DiscussionboardMemberDiscussionboardarticlesController";
import { DiscussionboardDiscussionboardarticlesController } from "./controllers/discussionBoard/discussionBoardArticles/DiscussionboardDiscussionboardarticlesController";
import { DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController } from "./controllers/discussionBoard/member/discussionBoardArticles/discussionBoardAttachments/DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController";
import { DiscussionboardMemberDiscussionboardcommentsController } from "./controllers/discussionBoard/member/discussionBoardComments/DiscussionboardMemberDiscussionboardcommentsController";
import { DiscussionboardDiscussionboardcommentsController } from "./controllers/discussionBoard/discussionBoardComments/DiscussionboardDiscussionboardcommentsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthAdminController,
    DiscussionboardAdminDiscussionboardguestsController,
    DiscussionboardDiscussionboardguestsController,
    DiscussionboardAdminDiscussionboardmembersController,
    DiscussionboardDiscussionboardmembersController,
    DiscussionboardMemberDiscussionboardmembersController,
    DiscussionboardAdminDiscussionboardmembersSessionsController,
    DiscussionboardMemberDiscussionboardmembersSessionsController,
    DiscussionboardAdminDiscussionboardadminsController,
    DiscussionboardAdminDiscussionboardadminsSessionsController,
    DiscussionboardMemberDiscussionboardarticlesController,
    DiscussionboardDiscussionboardarticlesController,
    DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController,
    DiscussionboardMemberDiscussionboardcommentsController,
    DiscussionboardDiscussionboardcommentsController,
  ],
})
export class MyModule {}
