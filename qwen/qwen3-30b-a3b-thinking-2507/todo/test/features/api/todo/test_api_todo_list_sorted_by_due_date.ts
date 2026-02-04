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
export async function test_api_todo_list_sorted_by_due_date(
  connection: api.IConnection,
): Promise<void> {
  // Create user
  const user = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Get user's todo list sorted by due date
  const todoList = await api.functional.todo.user.todos.index(connection, {
    body: { ids: [] } satisfies ITodoTodo.IRequest,
  });
  typia.assert(todoList);
  // Extract due dates for validation
  const dueDates = todoList.data.map((todo) => todo.due_date);
  // Validate sort order: closest due date first
  for (let i = 0; i < dueDates.length - 1; i++) {
    const current = dueDates[i];
    const next = dueDates[i + 1];
    const currentIsDate = current !== null && current !== undefined;
    const nextIsDate = next !== null && next !== undefined;
    // If both dates are valid, they should be in ascending order
    if (currentIsDate && nextIsDate) {
      TestValidator.predicate(
        `Due dates ordered correctly (closest first) for index ${i} and ${i + 1}`,
        new Date(current) <= new Date(next),
      );
    }
    // Null due dates should not come before valid due dates
    if (!currentIsDate && nextIsDate) {
      TestValidator.predicate(
        "Null due date appears before valid due date",
        false,
      );
    }
  }
}