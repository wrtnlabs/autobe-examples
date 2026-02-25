import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_index_sort_due_date_asc(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(connection, {
    body: { email, password },
  });
  // 2. Get todos sorted by due date ascending
  const response = await api.functional.todoApp.user.todos.index(connection, {
    body: {
      sortBy: "dueDate",
      order: "asc",
    },
  });
  // Validate the response type
  typia.assert(response);
  // 3. Validate sort order
  const dueDates = response.data.map((todo) => todo.due_date);
  const expectedDueDates = dueDates
    .filter((d) => d !== null)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  TestValidator.equals("due date order", dueDates, expectedDueDates);
}
