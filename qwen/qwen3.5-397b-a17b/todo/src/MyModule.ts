import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTodosPermanentController } from "./controllers/todoApp/member/todos/permanent/TodoappMemberTodosPermanentController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappGuestsController,
    TodoappGuestSessionsController,
    TodoappMembersController,
    TodoappMemberProfileController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosPermanentController,
    TodoappMemberTodosHistoriesController,
  ],
})
export class MyModule {}
