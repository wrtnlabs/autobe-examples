import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestSessionsController } from "./controllers/multiUserTodo/guest/sessions/MultiusertodoGuestSessionsController";
import { MultiusertodoGuestsController } from "./controllers/multiUserTodo/guests/MultiusertodoGuestsController";
import { MultiusertodoMember_email_verificationsController } from "./controllers/multiUserTodo/member-email-verifications/MultiusertodoMember_email_verificationsController";
import { MultiusertodoMember_password_resetsController } from "./controllers/multiUserTodo/member-password-resets/MultiusertodoMember_password_resetsController";
import { MultiusertodoMember_sessionsController } from "./controllers/multiUserTodo/member-sessions/MultiusertodoMember_sessionsController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTrashController } from "./controllers/multiUserTodo/member/trash/MultiusertodoMemberTrashController";
import { MultiusertodoMembersController } from "./controllers/multiUserTodo/members/MultiusertodoMembersController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoMembersController,
    MultiusertodoMemberProfileController,
    MultiusertodoMember_sessionsController,
    MultiusertodoMember_password_resetsController,
    MultiusertodoMember_email_verificationsController,
    MultiusertodoGuestsController,
    MultiusertodoGuestSessionsController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTrashController,
  ],
})
export class MyModule {}
