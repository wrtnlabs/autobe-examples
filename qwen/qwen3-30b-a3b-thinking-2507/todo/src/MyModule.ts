import { Module } from "@nestjs/common";

import { TodoAuthUserController } from "./controllers/todo/auth/user/TodoAuthUserController";
import { TodoUserAuthUsersController } from "./controllers/todo/user/auth/users/logout/TodoUserAuthUsersController";
import { TodoUserAuthUsersVerifyEmailController } from "./controllers/todo/user/auth/users/verify/email/TodoUserAuthUsersVerifyEmailController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";
import { TodoUserTodosBulk_deleteController } from "./controllers/todo/user/todos/bulk/delete/TodoUserTodosBulk_deleteController";
import { TodoUserTodosHistoriesController } from "./controllers/todo/user/todos/histories/TodoUserTodosHistoriesController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";

@Module({
  controllers: [
    TodoAuthUserController,
    TodoUserAuthUsersController,
    TodoUserAuthUsersVerifyEmailController,
    TodoUserUsersController,
    TodoUserTodosController,
    TodoUserTodosHistoriesController,
    TodoUserTodosBulk_deleteController,
  ],
})
export class MyModule {}
