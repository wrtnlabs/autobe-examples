import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberAccountsController } from "./controllers/todoApp/member/accounts/TodoappMemberAccountsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdithistoriesController } from "./controllers/todoApp/member/todos/editHistories/TodoappMemberTodosEdithistoriesController";
import { TodoappMemberTodosPermanentController } from "./controllers/todoApp/member/todos/permanent/TodoappMemberTodosPermanentController";
import { TodoappMemberTodosTrashedController } from "./controllers/todoApp/member/todos/trashed/TodoappMemberTodosTrashedController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMemberAccountsController,
    TodoappMemberSessionsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashedController,
    TodoappMemberTodosPermanentController,
    TodoappMemberTodosEdithistoriesController,
  ],
})
export class MyModule {}
