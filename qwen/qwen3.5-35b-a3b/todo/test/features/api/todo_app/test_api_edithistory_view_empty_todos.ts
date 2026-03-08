import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function test_api_edithistory_view_empty_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: typia.random<ITodoAppMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Create a new todo with all optional fields
  const createConnection: api.IConnection = { host: connection.host };
  const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    createConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify todo was created with correct user
  TestValidator.equals("todo belongs to member", todo.author.id, member.id);
  TestValidator.equals(
    "todo is incomplete by default",
    todo.is_complete,
    false,
  );
  TestValidator.equals("todo is not deleted", todo.is_deleted, false);
  // 4. Retrieve edit history (should be empty)
  const historyConnection: api.IConnection = { host: connection.host };
  const history: IPageITodoAppEditHistory.ISummary =
    await api.functional.todoApp.member.todos.history.index(historyConnection, {
      todoId: todo.id,
      body: {},
    });
  typia.assert(history);
  // 5. Validate empty history response
  TestValidator.equals("history data array is empty", history.data.length, 0);
  TestValidator.equals("total records is 0", history.pagination.records, 0);
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.equals("limit is default 20", history.pagination.limit, 20);
  TestValidator.equals("total pages is 0", history.pagination.pages, 0);
  // 6. Verify no error thrown for empty history (status 200 OK)
  // This is implicitly validated by successful API call completion
}
