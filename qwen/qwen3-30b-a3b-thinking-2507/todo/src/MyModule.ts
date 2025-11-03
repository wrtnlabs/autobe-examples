import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";
import { TodoTodosController } from "./controllers/todo/todos/TodoTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodoUserTodosController,
    TodoTodosController,
  ],
})
export class MyModule {}
