import { Module } from "@nestjs/common";

import { TodoUserTodoitemsController } from "./controllers/todo/user/todoItems/TodoUserTodoitemsController";

@Module({
  controllers: [TodoUserTodoitemsController],
})
export class MyModule {}
