import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardDiscussionboardarticlesController } from "./controllers/discussionBoard/discussionBoardArticles/DiscussionboardDiscussionboardarticlesController";
import { DiscussionboardMemberDiscussionboardarticlesController } from "./controllers/discussionBoard/member/discussionBoardArticles/DiscussionboardMemberDiscussionboardarticlesController";
import { DiscussionboardAdminDiscussionboardarticlesController } from "./controllers/discussionBoard/admin/discussionBoardArticles/DiscussionboardAdminDiscussionboardarticlesController";
import { DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController } from "./controllers/discussionBoard/member/discussionBoardArticles/discussionBoardAttachments/DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController";
import { DiscussionboardAdminDiscussionboardarticlesDiscussionboardattachmentsController } from "./controllers/discussionBoard/admin/discussionBoardArticles/discussionBoardAttachments/DiscussionboardAdminDiscussionboardarticlesDiscussionboardattachmentsController";
import { DiscussionboardAdminDiscussionboardmembersController } from "./controllers/discussionBoard/admin/discussionBoardMembers/DiscussionboardAdminDiscussionboardmembersController";
import { DiscussionboardMemberDiscussionboardmembersController } from "./controllers/discussionBoard/member/discussionBoardMembers/DiscussionboardMemberDiscussionboardmembersController";
import { DiscussionboardAdminDiscussionboardadminsController } from "./controllers/discussionBoard/admin/discussionBoardAdmins/DiscussionboardAdminDiscussionboardadminsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthAdminController,
    DiscussionboardDiscussionboardarticlesController,
    DiscussionboardMemberDiscussionboardarticlesController,
    DiscussionboardAdminDiscussionboardarticlesController,
    DiscussionboardMemberDiscussionboardarticlesDiscussionboardattachmentsController,
    DiscussionboardAdminDiscussionboardarticlesDiscussionboardattachmentsController,
    DiscussionboardAdminDiscussionboardmembersController,
    DiscussionboardMemberDiscussionboardmembersController,
    DiscussionboardAdminDiscussionboardadminsController,
  ],
})
export class MyModule {}
