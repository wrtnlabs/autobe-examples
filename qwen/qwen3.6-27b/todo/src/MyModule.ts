import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";
import { TodoappMemberTodosPermanent_deleteController } from "./controllers/todoApp/member/todos/permanent-delete/TodoappMemberTodosPermanent_deleteController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappProfileController } from "./controllers/todoApp/profile/TodoappProfileController";
import { TodoappSessionsController } from "./controllers/todoApp/sessions/TodoappSessionsController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappProfileController,
    TodoappSessionsController,
    TodoappMemberTodosController,
    TodoappMemberTodosEdit_historiesController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosPermanent_deleteController,
  ],
})
export class MyModule {}
