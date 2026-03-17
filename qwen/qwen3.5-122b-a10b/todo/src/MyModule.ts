import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestProfileController } from "./controllers/multiUserTodo/guest/profile/MultiusertodoGuestProfileController";
import { MultiusertodoGuestSessionsController } from "./controllers/multiUserTodo/guest/sessions/MultiusertodoGuestSessionsController";
import { MultiusertodoMemberEmail_verificationsController } from "./controllers/multiUserTodo/member/email-verifications/MultiusertodoMemberEmail_verificationsController";
import { MultiusertodoMemberPassword_resetsController } from "./controllers/multiUserTodo/member/password-resets/MultiusertodoMemberPassword_resetsController";
import { MultiusertodoMemberTodo_historiesController } from "./controllers/multiUserTodo/member/todo-histories/MultiusertodoMemberTodo_historiesController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoGuestProfileController,
    MultiusertodoGuestSessionsController,
    MultiusertodoMemberPassword_resetsController,
    MultiusertodoMemberEmail_verificationsController,
    MultiusertodoMemberTodo_historiesController,
  ],
})
export class MyModule {}
