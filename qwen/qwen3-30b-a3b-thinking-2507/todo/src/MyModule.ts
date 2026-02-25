import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserSessionsController } from "./controllers/todoApp/user/sessions/TodoappUserSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";
import { TodoappUserTrashesController } from "./controllers/todoApp/user/trashes/TodoappUserTrashesController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUserProfileController,
    TodoappUserSessionsController,
    TodoappUserTodosController,
    TodoappUserTrashController,
    TodoappUserTrashesController,
  ],
})
export class MyModule {}
