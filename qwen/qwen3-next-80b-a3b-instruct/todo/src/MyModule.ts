import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserProfileEditsController } from "./controllers/todoApp/user/profile/edits/TodoappUserProfileEditsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUserProfileController,
    TodoappUserProfileEditsController,
    TodoappUserTodosController,
    TodoappUserTrashController,
  ],
})
export class MyModule {}
