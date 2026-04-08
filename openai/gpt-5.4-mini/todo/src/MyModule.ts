import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberAccountsController } from "./controllers/todoApp/member/accounts/TodoappMemberAccountsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdithistoriesController } from "./controllers/todoApp/member/todos/editHistories/TodoappMemberTodosEdithistoriesController";
import { TodoappMemberTodosPermanent_deleteController } from "./controllers/todoApp/member/todos/permanent-delete/TodoappMemberTodosPermanent_deleteController";
import { TodoappMemberTodosRestoreController } from "./controllers/todoApp/member/todos/restore/TodoappMemberTodosRestoreController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMemberAccountsController,
    TodoappMemberSessionsController,
    TodoappMemberPassword_resetsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosRestoreController,
    TodoappMemberTodosPermanent_deleteController,
    TodoappMemberTodosEdithistoriesController,
  ],
})
export class MyModule {}
