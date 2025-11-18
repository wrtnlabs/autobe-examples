import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_task_invalid_order_value(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish context for task operations
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test that system rejects invalid order values ('up' and 'reverse')
  await TestValidator.error(
    "system must reject invalid order value 'up'",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: "up" satisfies ITodoListTask.IRequest,
      });
    },
  );

  await TestValidator.error(
    "system must reject invalid order value 'reverse'",
    async () => {
      await api.functional.todoList.user.tasks.index(connection, {
        body: "reverse" satisfies ITodoListTask.IRequest,
      });
    },
  );

  // Step 3: Verify valid order values (asc and desc) still work
  const validResult: IPageITodoListTask.ISummary =
    await api.functional.todoList.user.tasks.index(connection, {
      body: "asc" satisfies ITodoListTask.IRequest,
    });
  typia.assert(validResult);
  TestValidator.equals(
    "response should contain pagination",
    validResult.pagination,
    {
      current: 1,
      limit: 20,
      records: validResult.pagination.records,
      pages: validResult.pagination.pages,
    },
  );
}
