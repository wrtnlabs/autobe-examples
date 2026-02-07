import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserPassword_resetsController } from "./controllers/todoApp/user/password-resets/TodoappUserPassword_resetsController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserSessionsController } from "./controllers/todoApp/user/sessions/TodoappUserSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosCompletionController } from "./controllers/todoApp/user/todos/completion/TodoappUserTodosCompletionController";
import { TodoappUserTodosCompletionsController } from "./controllers/todoApp/user/todos/completions/TodoappUserTodosCompletionsController";
import { TodoappUserTodosDescriptionController } from "./controllers/todoApp/user/todos/description/TodoappUserTodosDescriptionController";
import { TodoappUserTodosDue_dateController } from "./controllers/todoApp/user/todos/due-date/TodoappUserTodosDue_dateController";
import { TodoappUserTodosHistoriesController } from "./controllers/todoApp/user/todos/histories/TodoappUserTodosHistoriesController";
import { TodoappUserTodosHistoriesChangesController } from "./controllers/todoApp/user/todos/histories/changes/TodoappUserTodosHistoriesChangesController";
import { TodoappUserTodosHistoriesSnapshotsController } from "./controllers/todoApp/user/todos/histories/snapshots/TodoappUserTodosHistoriesSnapshotsController";
import { TodoappUserTodosStart_dateController } from "./controllers/todoApp/user/todos/start-date/TodoappUserTodosStart_dateController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";
import { TodoappUserTrashCleanup_logsController } from "./controllers/todoApp/user/trash/cleanup-logs/TodoappUserTrashCleanup_logsController";
import { TodoappUserTrashCleanupNowController } from "./controllers/todoApp/user/trash/cleanup/now/TodoappUserTrashCleanupNowController";
import { TodoappUserTrashRestoreController } from "./controllers/todoApp/user/trash/restore/TodoappUserTrashRestoreController";
import { TodoappUserTrashSettingsController } from "./controllers/todoApp/user/trash/settings/TodoappUserTrashSettingsController";
import { TodoappUsersController } from "./controllers/todoApp/users/TodoappUsersController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUsersController,
    TodoappUserProfileController,
    TodoappUserSessionsController,
    TodoappUserPassword_resetsController,
    TodoappUserTodosController,
    TodoappUserTodosCompletionsController,
    TodoappUserTodosDescriptionController,
    TodoappUserTodosStart_dateController,
    TodoappUserTodosDue_dateController,
    TodoappUserTodosCompletionController,
    TodoappUserTodosHistoriesController,
    TodoappUserTodosHistoriesChangesController,
    TodoappUserTodosHistoriesSnapshotsController,
    TodoappUserTrashController,
    TodoappUserTrashSettingsController,
    TodoappUserTrashRestoreController,
    TodoappUserTrashCleanup_logsController,
    TodoappUserTrashCleanupNowController,
  ],
})
export class MyModule {}
