import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminMembersController } from "./controllers/discussionBoard/admin/members/DiscussionboardAdminMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardTopicsController } from "./controllers/discussionBoard/topics/DiscussionboardTopicsController";
import { DiscussionboardMemberTopicsController } from "./controllers/discussionBoard/member/topics/DiscussionboardMemberTopicsController";
import { DiscussionboardAdminTopicsController } from "./controllers/discussionBoard/admin/topics/DiscussionboardAdminTopicsController";
import { DiscussionboardTopicsRepliesController } from "./controllers/discussionBoard/topics/replies/DiscussionboardTopicsRepliesController";
import { DiscussionboardMemberTopicsRepliesController } from "./controllers/discussionBoard/member/topics/replies/DiscussionboardMemberTopicsRepliesController";
import { DiscussionboardAdminTopicsRepliesController } from "./controllers/discussionBoard/admin/topics/replies/DiscussionboardAdminTopicsRepliesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthAdminController,
    DiscussionboardAdminMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardAdminAdminsController,
    DiscussionboardTopicsController,
    DiscussionboardMemberTopicsController,
    DiscussionboardAdminTopicsController,
    DiscussionboardTopicsRepliesController,
    DiscussionboardMemberTopicsRepliesController,
    DiscussionboardAdminTopicsRepliesController,
  ],
})
export class MyModule {}
