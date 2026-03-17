import { Module } from "@nestjs/common";

import { MultiusertodoappAuthGuestController } from "./controllers/multiUserTodoApp/auth/guest/MultiusertodoappAuthGuestController";
import { MultiusertodoappAuthMemberController } from "./controllers/multiUserTodoApp/auth/member/MultiusertodoappAuthMemberController";
import { MultiusertodoappMemberProfileController } from "./controllers/multiUserTodoApp/member/profile/MultiusertodoappMemberProfileController";
import { MultiusertodoappMemberSessionsController } from "./controllers/multiUserTodoApp/member/sessions/MultiusertodoappMemberSessionsController";
import { MultiusertodoappMemberTodosController } from "./controllers/multiUserTodoApp/member/todos/MultiusertodoappMemberTodosController";
import { MultiusertodoappMemberTodosHistoryController } from "./controllers/multiUserTodoApp/member/todos/history/MultiusertodoappMemberTodosHistoryController";
import { MultiusertodoappMemberTodosTrashController } from "./controllers/multiUserTodoApp/member/todos/trash/MultiusertodoappMemberTodosTrashController";

@Module({
  controllers: [
    MultiusertodoappAuthGuestController,
    MultiusertodoappAuthMemberController,
    MultiusertodoappMemberProfileController,
    MultiusertodoappMemberSessionsController,
    MultiusertodoappMemberTodosController,
    MultiusertodoappMemberTodosTrashController,
    MultiusertodoappMemberTodosHistoryController,
  ],
})
export class MyModule {}
