import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserSessionsController } from "./controllers/todoApp/user/sessions/TodoappUserSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosHistoriesController } from "./controllers/todoApp/user/todos/histories/TodoappUserTodosHistoriesController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUserProfileController,
    TodoappUserSessionsController,
    TodoappUserTodosController,
    TodoappUserTodosHistoriesController,
    TodoappUserTrashController,
  ],
})
export class MyModule {}
