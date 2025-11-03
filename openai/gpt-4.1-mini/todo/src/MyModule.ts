import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoUserTodousersController } from "./controllers/todo/user/todoUsers/TodoUserTodousersController";
import { TodoTodousersController } from "./controllers/todo/todoUsers/TodoTodousersController";
import { TodoUserTodousersSessionsController } from "./controllers/todo/user/todoUsers/sessions/TodoUserTodousersSessionsController";
import { TodoUserTodoitemsController } from "./controllers/todo/user/todoItems/TodoUserTodoitemsController";

@Module({
  controllers: [
    AuthUserController,
    TodoUserTodousersController,
    TodoTodousersController,
    TodoUserTodousersSessionsController,
    TodoUserTodoitemsController,
  ],
})
export class MyModule {}
