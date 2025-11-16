import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoappUserConfigurationsController } from "./controllers/todoApp/user/configurations/TodoappUserConfigurationsController";
import { TodoappConfigurationsController } from "./controllers/todoApp/configurations/TodoappConfigurationsController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUsersSessionsController } from "./controllers/todoApp/user/users/sessions/TodoappUserUsersSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodosController } from "./controllers/todos/TodosController";
import { TodoappUserTodosLifecycleController } from "./controllers/todoApp/user/todos/lifecycle/TodoappUserTodosLifecycleController";
import { TodoappUserTodosSnapshotsController } from "./controllers/todoApp/user/todos/snapshots/TodoappUserTodosSnapshotsController";
import { TodoappUserTodosStatusesController } from "./controllers/todoApp/user/todos/statuses/TodoappUserTodosStatusesController";
import { TodoappTodosPrioritiesController } from "./controllers/todoApp/todos/priorities/TodoappTodosPrioritiesController";
import { TodoappUserDashboardTodo_overviewController } from "./controllers/todoApp/user/dashboard/todo-overview/TodoappUserDashboardTodo_overviewController";
import { TodoappUserAnalyticsTodo_completionController } from "./controllers/todoApp/user/analytics/todo-completion/TodoappUserAnalyticsTodo_completionController";
import { TodoappUserSearchTodosController } from "./controllers/todoApp/user/search/todos/TodoappUserSearchTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodoappUserConfigurationsController,
    TodoappConfigurationsController,
    TodoappUserUsersController,
    TodoappUserUsersSessionsController,
    TodoappUserTodosController,
    TodosController,
    TodoappUserTodosLifecycleController,
    TodoappUserTodosSnapshotsController,
    TodoappUserTodosStatusesController,
    TodoappTodosPrioritiesController,
    TodoappUserDashboardTodo_overviewController,
    TodoappUserAnalyticsTodo_completionController,
    TodoappUserSearchTodosController,
  ],
})
export class MyModule {}
