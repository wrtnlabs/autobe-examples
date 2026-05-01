import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";
import { TodoappPassword_resetsController } from "./controllers/todoApp/password-resets/TodoappPassword_resetsController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappGuestsController,
    TodoappGuestSessionsController,
    TodoappMembersController,
    TodoappMemberProfileController,
    TodoappPassword_resetsController,
    TodoappMemberPassword_resetsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosEdit_historiesController,
  ],
})
export class MyModule {}
