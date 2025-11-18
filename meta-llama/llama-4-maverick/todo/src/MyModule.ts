import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoUserActorsMeController } from "./controllers/todo/user/actors/me/TodoUserActorsMeController";
import { TodoUserActorsMeSessionsController } from "./controllers/todo/user/actors/me/sessions/TodoUserActorsMeSessionsController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodoUserActorsMeController,
    TodoUserActorsMeSessionsController,
    TodoUserTodosController,
  ],
})
export class MyModule {}
