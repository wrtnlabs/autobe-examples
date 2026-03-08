import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/join/TodoappAuthMemberController";
import { TodoappAuthMemberLoginController } from "./controllers/todoApp/auth/member/login/TodoappAuthMemberLoginController";
import { TodoappAuthMemberRefreshController } from "./controllers/todoApp/auth/member/refresh/TodoappAuthMemberRefreshController";
import { TodoappMemberEmail_verificationsController } from "./controllers/todoApp/member/email-verifications/TodoappMemberEmail_verificationsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodoappTodosHistoriesController } from "./controllers/todoApp/member/todoApp/todos/histories/TodoappMemberTodoappTodosHistoriesController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTodosPermanentController } from "./controllers/todoApp/member/todos/permanent/TodoappMemberTodosPermanentController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappAuthMemberLoginController,
    TodoappAuthMemberRefreshController,
    TodoappMemberProfileController,
    TodoappMemberSessionsController,
    TodoappMemberEmail_verificationsController,
    TodoappMemberPassword_resetsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosPermanentController,
    TodoappMemberTodosHistoriesController,
    TodoappMemberTodoappTodosHistoriesController,
  ],
})
export class MyModule {}
