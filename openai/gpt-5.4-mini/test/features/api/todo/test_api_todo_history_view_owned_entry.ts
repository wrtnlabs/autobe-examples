import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_todo_history_view_owned_entry(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const ownedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(ownedTodo);
  const history = await api.functional.todoApp.member.todos.histories.at(
    memberConnection,
    {
      todoId: ownedTodo.id,
      historyId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "history todo id matches requested todo",
    history.todo.id,
    ownedTodo.id,
  );
  TestValidator.equals(
    "history todo title matches owned todo title",
    history.todo.title,
    ownedTodo.title,
  );
  TestValidator.predicate(
    "history edited_at is an ISO string",
    history.edited_at.length > 0,
  );
  TestValidator.predicate(
    "history has recorded title or null",
    history.title === null || history.title.length >= 0,
  );
  TestValidator.predicate(
    "history has recorded description or null",
    history.description === null || history.description.length >= 0,
  );
  TestValidator.predicate(
    "history has recorded start date or null",
    history.start_date === null || history.start_date.length > 0,
  );
  TestValidator.predicate(
    "history has recorded due date or null",
    history.due_date === null || history.due_date.length > 0,
  );
}
