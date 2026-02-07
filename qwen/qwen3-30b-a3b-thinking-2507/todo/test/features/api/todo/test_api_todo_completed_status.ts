import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_completed_status(connection: api.IConnection): Promise<void> {
    // 1. User registration and authentication
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
        body: typia.random<ITodoUser.IJoin>(),
    });
    // 2. Filter todos by completed status
    const completedTodos = await api.functional.todo.user.todos.index(userConnection, {
        body: {
            status: "completed",
        } satisfies ITodoTodo.IRequest,
    });
    typia.assert(completedTodos);
    // 3. Validate response data
    TestValidator.predicate("Should have at least one completed todo", completedTodos.data.length > 0);
    // Verify all todos in response are marked as completed
    for (const todo of completedTodos.data) {
        TestValidator.predicate(`Todo ID ${todo.id} should be marked as completed`,
      todo.is_completed === true,
    );
  }
}