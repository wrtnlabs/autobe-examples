import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberMemberPassword_resetsController } from "./controllers/todoApp/member/member/password-resets/TodoappMemberMemberPassword_resetsController";
import { TodoappMemberMemberProfileController } from "./controllers/todoApp/member/member/profile/TodoappMemberMemberProfileController";
import { TodoappMemberMemberSessionsController } from "./controllers/todoApp/member/member/sessions/TodoappMemberMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historiesController } from "./controllers/todoApp/member/todos/edit-histories/TodoappMemberTodosEdit_historiesController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/TodoappMemberTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMembersController,
    TodoappMemberMemberProfileController,
    TodoappMemberMemberSessionsController,
    TodoappMemberMemberPassword_resetsController,
    TodoappMemberTodosController,
    TodoappMemberTrashController,
    TodoappMemberTodosEdit_historiesController,
  ],
})
export class MyModule {}
