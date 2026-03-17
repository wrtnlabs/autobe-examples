import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestSessionsController } from "./controllers/multiUserTodo/guest/sessions/MultiusertodoGuestSessionsController";
import { MultiusertodoMemberAccountController } from "./controllers/multiUserTodo/member/account/MultiusertodoMemberAccountController";
import { MultiusertodoMemberPasswordController } from "./controllers/multiUserTodo/member/password/MultiusertodoMemberPasswordController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberSessionsController } from "./controllers/multiUserTodo/member/sessions/MultiusertodoMemberSessionsController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosHistoriesController } from "./controllers/multiUserTodo/member/todos/histories/MultiusertodoMemberTodosHistoriesController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoGuestSessionsController,
    MultiusertodoMemberProfileController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTodosHistoriesController,
    MultiusertodoMemberSessionsController,
    MultiusertodoMemberPasswordController,
    MultiusertodoMemberAccountController,
  ],
})
export class MyModule {}
