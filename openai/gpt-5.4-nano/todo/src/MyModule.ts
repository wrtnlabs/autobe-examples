import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoMemberDashboardTodosSummaryController } from "./controllers/multiUserTodo/member/dashboard/todos/summary/MultiusertodoMemberDashboardTodosSummaryController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberProfilesController } from "./controllers/multiUserTodo/member/profiles/MultiusertodoMemberProfilesController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosBulk_move_to_trashController } from "./controllers/multiUserTodo/member/todos/bulk-move-to-trash/MultiusertodoMemberTodosBulk_move_to_trashController";
import { MultiusertodoMemberTodosBulk_permanent_deleteController } from "./controllers/multiUserTodo/member/todos/bulk-permanent-delete/MultiusertodoMemberTodosBulk_permanent_deleteController";
import { MultiusertodoMemberTodosBulk_restore_from_trashController } from "./controllers/multiUserTodo/member/todos/bulk-restore-from-trash/MultiusertodoMemberTodosBulk_restore_from_trashController";
import { MultiusertodoMemberTodosBulk_toggle_completionController } from "./controllers/multiUserTodo/member/todos/bulk-toggle-completion/MultiusertodoMemberTodosBulk_toggle_completionController";
import { MultiusertodoMemberTodosEdit_history_entriesController } from "./controllers/multiUserTodo/member/todos/edit-history-entries/MultiusertodoMemberTodosEdit_history_entriesController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoMemberProfilesController,
    MultiusertodoMemberProfileController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTodosEdit_history_entriesController,
    MultiusertodoMemberDashboardTodosSummaryController,
    MultiusertodoMemberTodosBulk_move_to_trashController,
    MultiusertodoMemberTodosBulk_restore_from_trashController,
    MultiusertodoMemberTodosBulk_permanent_deleteController,
    MultiusertodoMemberTodosBulk_toggle_completionController,
  ],
})
export class MyModule {}
