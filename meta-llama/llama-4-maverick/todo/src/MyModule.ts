import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserTodoitemsController } from "./controllers/todoList/user/todoItems/TodolistUserTodoitemsController";

@Module({
  controllers: [AuthUserController, TodolistUserTodoitemsController],
})
export class MyModule {}
