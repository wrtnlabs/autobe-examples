import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappGuestSessionsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosEdit_historiesController,
  ],
})
export class MyModule {}
