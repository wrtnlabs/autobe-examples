import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestSessionsController } from "./controllers/multiUserTodo/guest/sessions/MultiusertodoGuestSessionsController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosHistoryController } from "./controllers/multiUserTodo/member/todos/history/MultiusertodoMemberTodosHistoryController";
import { MultiusertodoMemberTodosTrashController } from "./controllers/multiUserTodo/member/todos/trash/MultiusertodoMemberTodosTrashController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoGuestSessionsController,
    MultiusertodoMemberProfileController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTodosTrashController,
    MultiusertodoMemberTodosHistoryController,
  ],
})
export class MyModule {}
