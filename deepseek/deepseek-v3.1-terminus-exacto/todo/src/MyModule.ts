import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserController } from "./controllers/todoApp/user/TodoappUserController";
import { TodoappUserBulk_permanent_deleteController } from "./controllers/todoApp/user/bulk-permanent-delete/TodoappUserBulk_permanent_deleteController";
import { TodoappUserBulk_restoreController } from "./controllers/todoApp/user/bulk-restore/TodoappUserBulk_restoreController";
import { TodoappUserDashboardController } from "./controllers/todoApp/user/dashboard/TodoappUserDashboardController";
import { TodoappUserFiltersController } from "./controllers/todoApp/user/filters/TodoappUserFiltersController";
import { TodoappUserHistory_metadataController } from "./controllers/todoApp/user/history-metadata/TodoappUserHistory_metadataController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosCompletionController } from "./controllers/todoApp/user/todos/completion/TodoappUserTodosCompletionController";
import { TodoappUserTodosHistoriesController } from "./controllers/todoApp/user/todos/histories/TodoappUserTodosHistoriesController";
import { TodoappUserTodosHistoriesChangesController } from "./controllers/todoApp/user/todos/histories/changes/TodoappUserTodosHistoriesChangesController";
import { TodoappUserTodosHistoriesSnapshotsController } from "./controllers/todoApp/user/todos/histories/snapshots/TodoappUserTodosHistoriesSnapshotsController";
import { TodoappUserTodosHistoryController } from "./controllers/todoApp/user/todos/history/TodoappUserTodosHistoryController";
import { TodoappUserTodosHistorySnapshotsController } from "./controllers/todoApp/user/todos/history/snapshots/TodoappUserTodosHistorySnapshotsController";
import { TodoappUserTodosPermanentController } from "./controllers/todoApp/user/todos/permanent/TodoappUserTodosPermanentController";
import { TodoappUserTodosTrashController } from "./controllers/todoApp/user/todos/trash/TodoappUserTodosTrashController";
import { TodoappUserTodosTrashCleanup_logsController } from "./controllers/todoApp/user/todos/trash/cleanup-logs/TodoappUserTodosTrashCleanup_logsController";
import { TodoappUserTodosTrashMetadataController } from "./controllers/todoApp/user/todos/trash/metadata/TodoappUserTodosTrashMetadataController";
import { TodoappUserTodosTrashPermanent_deleteController } from "./controllers/todoApp/user/todos/trash/permanent-delete/TodoappUserTodosTrashPermanent_deleteController";
import { TodoappUserTrash_settingsController } from "./controllers/todoApp/user/trash-settings/TodoappUserTrash_settingsController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";
import { TodoappUserUsersProfileController } from "./controllers/todoApp/user/users/profile/TodoappUserUsersProfileController";
import { TodoappUsersController } from "./controllers/todoApp/users/TodoappUsersController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUsersController,
    TodoappUserTodosController,
    TodoappUserTodosCompletionController,
    TodoappUserTrashController,
    TodoappUserTodosPermanentController,
    TodoappUserTodosHistoryController,
    TodoappUserTodosHistoriesController,
    TodoappUserTodosHistoriesChangesController,
    TodoappUserTodosHistoriesSnapshotsController,
    TodoappUserHistory_metadataController,
    TodoappUserTodosTrashController,
    TodoappUserTodosTrashPermanent_deleteController,
    TodoappUserTrash_settingsController,
    TodoappUserTodosTrashCleanup_logsController,
    TodoappUserTodosTrashMetadataController,
    TodoappUserUsersProfileController,
    TodoappUserController,
    TodoappUserFiltersController,
    TodoappUserDashboardController,
    TodoappUserTodosHistorySnapshotsController,
    TodoappUserBulk_restoreController,
    TodoappUserBulk_permanent_deleteController,
  ],
})
export class MyModule {}
