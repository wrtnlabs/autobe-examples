import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_sort_due_date_asc(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Get todos with sort parameters
  const response = await api.functional.todo.user.todos.index(userConnection, {
    body: {
      sortField: "dueDate",
      sortDirection: "asc",
    } satisfies ITodoTodo.IRequest,
  });
  typia.assert(response);
  // 3. Validate response ordering
  TestValidator.equals(
    "Should have at least some todos",
    response.data.length,
    0,
  );
  // Verify todos with due dates are sorted in ascending order
  const todosWithDueDate = response.data.filter((todo) => todo.due_date);
  for (let i = 0; i < todosWithDueDate.length - 1; i++) {
    const currentDueDate = new Date(todosWithDueDate[i].due_date!);
    const nextDueDate = new Date(todosWithDueDate[i + 1].due_date!);
    TestValidator.predicate(
      "Due dates should be in ascending order",
      currentDueDate <= nextDueDate,
    );
  }
  // Verify todos without due date are ordered last
  const hasNoDueDate = response.data.some((todo) => !todo.due_date);
  if (hasNoDueDate) {
    const firstNoDueDateIndex = response.data.findIndex(
      (todo) => !todo.due_date,
    );
    const todosWithoutDueDate = response.data.slice(firstNoDueDateIndex);
    TestValidator.predicate(
      "Todos without due date should be at the end",
      todosWithoutDueDate.every((todo) => !todo.due_date),
    );
  }
}
