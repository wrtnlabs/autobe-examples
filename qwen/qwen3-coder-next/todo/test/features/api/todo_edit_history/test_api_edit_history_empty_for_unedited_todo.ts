import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistoryEntry";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_edit_history_empty_for_unedited_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(authorized);
  // 2. Create todo with title only (no subsequent edits)
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Test todo for empty edit history",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history
  const history = await api.functional.todoApp.member.todos.history.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(history);
  // 4. Verify empty edit history
  TestValidator.equals(
    "pagination metadata correct",
    history.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit present",
    history.pagination.limit > 0,
    true,
  );
  TestValidator.equals("no edit records", history.pagination.records, 0);
  TestValidator.equals("no pages", history.pagination.pages, 0);
  TestValidator.equals("empty data array", history.data, []);
  TestValidator.predicate("todo still exists", todo.id !== undefined);
}
