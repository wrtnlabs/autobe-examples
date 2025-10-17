import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AdminPostsController } from "./controllers/admin/posts/AdminPostsController";
import { EconomicboardAdminTopicsController } from "./controllers/economicBoard/admin/topics/EconomicboardAdminTopicsController";
import { EconomicboardAdminGuestsController } from "./controllers/economicBoard/admin/guests/EconomicboardAdminGuestsController";
import { EconomicboardGuestsController } from "./controllers/economicBoard/guests/EconomicboardGuestsController";
import { EconomicboardAdminMembersController } from "./controllers/economicBoard/admin/members/EconomicboardAdminMembersController";
import { EconomicboardMemberMembersController } from "./controllers/economicBoard/member/members/EconomicboardMemberMembersController";
import { EconomicboardAdminAdminsController } from "./controllers/economicBoard/admin/admins/EconomicboardAdminAdminsController";
import { EconomicboardMemberMeController } from "./controllers/economicBoard/member/me/EconomicboardMemberMeController";
import { EconomicboardPostsController } from "./controllers/economicBoard/posts/EconomicboardPostsController";
import { EconomicboardMemberPostsController } from "./controllers/economicBoard/member/posts/EconomicboardMemberPostsController";
import { EconomicboardAdminPostsController } from "./controllers/economicBoard/admin/posts/EconomicboardAdminPostsController";
import { EconomicboardPostsRepliesController } from "./controllers/economicBoard/posts/replies/EconomicboardPostsRepliesController";
import { EconomicboardMemberPostsRepliesController } from "./controllers/economicBoard/member/posts/replies/EconomicboardMemberPostsRepliesController";
import { EconomicboardAdminPostsRepliesController } from "./controllers/economicBoard/admin/posts/replies/EconomicboardAdminPostsRepliesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthAdminController,
    AdminPostsController,
    EconomicboardAdminTopicsController,
    EconomicboardAdminGuestsController,
    EconomicboardGuestsController,
    EconomicboardAdminMembersController,
    EconomicboardMemberMembersController,
    EconomicboardAdminAdminsController,
    EconomicboardMemberMeController,
    EconomicboardPostsController,
    EconomicboardMemberPostsController,
    EconomicboardAdminPostsController,
    EconomicboardPostsRepliesController,
    EconomicboardMemberPostsRepliesController,
    EconomicboardAdminPostsRepliesController,
  ],
})
export class MyModule {}
