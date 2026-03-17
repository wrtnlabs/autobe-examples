import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMemberSessionsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosEdit_historiesController,
    TodoappMemberTodosTrashController,
  ],
})
export class MyModule {}
