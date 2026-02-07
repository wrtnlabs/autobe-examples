import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappSystem_auditsController } from "./controllers/todoApp/system-audits/TodoappSystem_auditsController";
import { TodoappSystem_settingsController } from "./controllers/todoApp/system-settings/TodoappSystem_settingsController";
import { TodoappTrashController } from "./controllers/todoApp/trash/cleanup/TodoappTrashController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosHistoryController } from "./controllers/todoApp/user/todos/history/TodoappUserTodosHistoryController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappSystem_auditsController,
    TodoappSystem_settingsController,
    TodoappUserTodosController,
    TodoappUserTrashController,
    TodoappUserTodosHistoryController,
    TodoappTrashController,
  ],
})
export class MyModule {}
