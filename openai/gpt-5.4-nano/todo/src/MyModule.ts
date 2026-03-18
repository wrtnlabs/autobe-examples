import { Module } from "@nestjs/common";

import { MultiusertodoAuthGuestController } from "./controllers/multiUserTodo/auth/guest/MultiusertodoAuthGuestController";
import { MultiusertodoAuthMemberController } from "./controllers/multiUserTodo/auth/member/MultiusertodoAuthMemberController";
import { MultiusertodoGuestSessionsController } from "./controllers/multiUserTodo/guest/sessions/MultiusertodoGuestSessionsController";
import { MultiusertodoMemberAccountController } from "./controllers/multiUserTodo/member/account/MultiusertodoMemberAccountController";
import { MultiusertodoMemberEmail_verificationsController } from "./controllers/multiUserTodo/member/email-verifications/MultiusertodoMemberEmail_verificationsController";
import { MultiusertodoMemberPassword_resetsController } from "./controllers/multiUserTodo/member/password-resets/MultiusertodoMemberPassword_resetsController";
import { MultiusertodoMemberProfileController } from "./controllers/multiUserTodo/member/profile/MultiusertodoMemberProfileController";
import { MultiusertodoMemberProfilesnapshotsController } from "./controllers/multiUserTodo/member/profileSnapshots/MultiusertodoMemberProfilesnapshotsController";
import { MultiusertodoMemberProfilesController } from "./controllers/multiUserTodo/member/profiles/MultiusertodoMemberProfilesController";
import { MultiusertodoMemberTodosController } from "./controllers/multiUserTodo/member/todos/MultiusertodoMemberTodosController";
import { MultiusertodoMemberTodosEdithistoryController } from "./controllers/multiUserTodo/member/todos/editHistory/MultiusertodoMemberTodosEdithistoryController";
import { MultiusertodoMemberTodosEdithistoryentriesController } from "./controllers/multiUserTodo/member/todos/editHistoryEntries/MultiusertodoMemberTodosEdithistoryentriesController";
import { MultiusertodoMemberTodosEdithistoryentriesChangesController } from "./controllers/multiUserTodo/member/todos/editHistoryEntries/changes/MultiusertodoMemberTodosEdithistoryentriesChangesController";
import { MultiusertodoMemberTrashController } from "./controllers/multiUserTodo/member/trash/MultiusertodoMemberTrashController";
import { MultiusertodoMemberTrashRestoreController } from "./controllers/multiUserTodo/member/trash/restore/MultiusertodoMemberTrashRestoreController";

@Module({
  controllers: [
    MultiusertodoAuthGuestController,
    MultiusertodoAuthMemberController,
    MultiusertodoGuestSessionsController,
    MultiusertodoMemberPassword_resetsController,
    MultiusertodoMemberEmail_verificationsController,
    MultiusertodoMemberProfilesController,
    MultiusertodoMemberProfilesnapshotsController,
    MultiusertodoMemberTodosEdithistoryentriesController,
    MultiusertodoMemberTodosEdithistoryentriesChangesController,
    MultiusertodoMemberTodosController,
    MultiusertodoMemberTrashController,
    MultiusertodoMemberTrashRestoreController,
    MultiusertodoMemberTodosEdithistoryController,
    MultiusertodoMemberAccountController,
    MultiusertodoMemberProfileController,
  ],
})
export class MyModule {}
