import { Module } from "@nestjs/common";

import { TodoappAuthAdminController } from "./controllers/todoApp/auth/admin/TodoappAuthAdminController";
import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTodosHistoryController } from "./controllers/todoApp/member/todos/history/TodoappMemberTodosHistoryController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/TodoappMemberTrashController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappAuthAdminController,
    TodoappMemberSessionsController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosHistoryController,
    TodoappMemberTodosHistoriesController,
    TodoappMemberTrashController,
  ],
})
export class MyModule {}
