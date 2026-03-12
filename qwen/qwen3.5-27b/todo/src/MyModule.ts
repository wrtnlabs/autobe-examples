import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberSessionsController } from "./controllers/multiUserTodo/member/sessions/MultiusertodoMemberSessionsController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosEdit_historiesController } from "./controllers/multiUserTodo/member/todos/edit-histories/MultiusertodoMemberTodosEdit_historiesController";
import { MultiusertodoMemberTrashController } from "./controllers/multiUserTodo/member/trash/MultiusertodoMemberTrashController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoMemberProfileController,
    MultiusertodoMemberSessionsController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTodosEdit_historiesController,
    MultiusertodoMemberTrashController,
  ],
})
export class MyModule {}
