import { Module } from "@nestjs/common";

import { TodoappAuthTodo_userController } from "./controllers/todoApp/auth/todo-user/TodoappAuthTodo_userController";
import { TodoappConfigurationsBulkController } from "./controllers/todoApp/configurations/bulk/TodoappConfigurationsBulkController";
import { TodoappConfigurationsSearchController } from "./controllers/todoApp/configurations/search/TodoappConfigurationsSearchController";
import { TodoappSystemMetricsController } from "./controllers/todoApp/system/metrics/TodoappSystemMetricsController";
import { TodoappSystemSettingsController } from "./controllers/todoApp/system/settings/validate/TodoappSystemSettingsController";
import { TodoappSystemStatusController } from "./controllers/todoApp/system/status/TodoappSystemStatusController";
import { TodoappTodouserAuthTodo_usersEmail_verificationController } from "./controllers/todoApp/todoUser/auth/todo-users/email-verification/TodoappTodouserAuthTodo_usersEmail_verificationController";
import { TodoappTodouserAuthTodo_usersController } from "./controllers/todoApp/todoUser/auth/todo-users/logout/TodoappTodouserAuthTodo_usersController";
import { TodoappTodouserConfigurationsController } from "./controllers/todoApp/todoUser/configurations/TodoappTodouserConfigurationsController";
import { TodoappTodouserSchemaVersionsController } from "./controllers/todoApp/todoUser/schema/versions/TodoappTodouserSchemaVersionsController";
import { TodoappTodouserSystemSettingsController } from "./controllers/todoApp/todoUser/system/settings/TodoappTodouserSystemSettingsController";
import { TodoappTodouserTodo_usersController } from "./controllers/todoApp/todoUser/todo-users/TodoappTodouserTodo_usersController";
import { TodoappTodouserTodosController } from "./controllers/todoApp/todoUser/todos/TodoappTodouserTodosController";
import { TodoappTodouserTodosEdit_historiesController } from "./controllers/todoApp/todoUser/todos/edit-histories/TodoappTodouserTodosEdit_historiesController";
import { TodoappTodouserTodosSearchController } from "./controllers/todoApp/todoUser/todos/search/TodoappTodouserTodosSearchController";
import { TodoappTodouserTrashEntriesController } from "./controllers/todoApp/todoUser/trash/entries/TodoappTodouserTrashEntriesController";
import { TodoappTodouserTrashPermanent_deletion_recordsController } from "./controllers/todoApp/todoUser/trash/permanent-deletion-records/TodoappTodouserTrashPermanent_deletion_recordsController";

@Module({
  controllers: [
    TodoappAuthTodo_userController,
    TodoappTodouserAuthTodo_usersEmail_verificationController,
    TodoappTodouserAuthTodo_usersController,
    TodoappTodouserTodo_usersController,
    TodoappTodouserTodosController,
    TodoappTodouserTodosEdit_historiesController,
    TodoappTodouserTrashEntriesController,
    TodoappTodouserTrashPermanent_deletion_recordsController,
    TodoappTodouserConfigurationsController,
    TodoappTodouserSystemSettingsController,
    TodoappTodouserSchemaVersionsController,
    TodoappTodouserTodosSearchController,
    TodoappConfigurationsSearchController,
    TodoappSystemStatusController,
    TodoappSystemMetricsController,
    TodoappConfigurationsBulkController,
    TodoappSystemSettingsController,
  ],
})
export class MyModule {}
