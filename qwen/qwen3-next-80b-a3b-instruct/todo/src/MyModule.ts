import { Module } from "@nestjs/common";

import { TodoappAuthController } from "./controllers/todoApp/auth/TodoappAuthController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosHistoriesController } from "./controllers/todoApp/user/todos/histories/TodoappUserTodosHistoriesController";
import { TodoappUserTodosHistoryController } from "./controllers/todoApp/user/todos/history/TodoappUserTodosHistoryController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";

@Module({
  controllers: [
    TodoappAuthController,
    TodoappUserProfileController,
    TodoappUserTodosController,
    TodoappUserTrashController,
    TodoappUserTodosHistoriesController,
    TodoappUserTodosHistoryController,
  ],
})
export class MyModule {}
