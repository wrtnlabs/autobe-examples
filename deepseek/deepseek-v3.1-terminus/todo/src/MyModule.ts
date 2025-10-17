import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { MinimaltodoTodosController } from "./controllers/minimalTodo/todos/MinimaltodoTodosController";

@Module({
  controllers: [AuthUserController, MinimaltodoTodosController],
})
export class MyModule {}
