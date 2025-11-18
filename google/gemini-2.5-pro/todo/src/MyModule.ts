import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";
import { TodoUserUsersSessionsController } from "./controllers/todo/user/users/sessions/TodoUserUsersSessionsController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodoUserUsersController,
    TodoUserUsersSessionsController,
    TodoUserTodosController,
  ],
})
export class MyModule {}
