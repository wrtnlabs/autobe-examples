import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/TodoappMemberTrashController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMemberProfileController,
    TodoappGuestSessionsController,
    TodoappMemberTodosController,
    TodoappMemberTrashController,
    TodoappMemberTodosHistoriesController,
  ],
})
export class MyModule {}
