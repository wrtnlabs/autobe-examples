import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";
import { TodoappMemberTodosEraseController } from "./controllers/todoApp/member/todos/erase/TodoappMemberTodosEraseController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/TodoappMemberTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappGuestsController,
    TodoappGuestSessionsController,
    TodoappMembersController,
    TodoappMemberPassword_resetsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTrashController,
    TodoappMemberTodosEraseController,
    TodoappMemberTodosEdit_historiesController,
  ],
})
export class MyModule {}
