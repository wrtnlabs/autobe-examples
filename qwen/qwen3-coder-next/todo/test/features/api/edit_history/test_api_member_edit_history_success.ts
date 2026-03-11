import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_member_edit_history_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member A
  const memberConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: "12345678",
      href: "https://example.com/register",
      referrer: "https://example.com/ref",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberA);
  // Create new connection with access token
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    authorization: `Bearer ${memberA.access_token.access_token}`,
  };
  // 2. Create a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo multiple times to generate history
  const edit1 = await api.functional.todoApp.member.todos.edit_history.index(
    memberAConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(edit1);
  const edit2 = await api.functional.todoApp.member.todos.edit_history.index(
    memberAConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(edit2);
  // 4. Get edit history and verify
  const history = await api.functional.todoApp.member.todos.history.at(
    memberAConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(history);
  // 5. Validate history structure
  TestValidator.predicate("has valid id", typeof history.id === "string");
  TestValidator.predicate(
    "has valid created_at",
    typeof history.created_at === "string",
  );
}