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

export async function test_api_todo_history_view_own_todo(
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
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const todo = await api.functional.todoApp.member.todos.at(memberConnection, {
    todoId,
  });
  typia.assert(todo);
  const history =
    await api.functional.todoApp.member.todos.histories.getByTodoid(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "history belongs to requested todo",
    history.todo.id,
    todo.id,
  );
  TestValidator.equals(
    "history parent member matches todo owner",
    history.todo.member.id,
    todo.member.id,
  );
  TestValidator.equals(
    "history parent title matches detail record",
    history.todo.title,
    todo.title,
  );
  TestValidator.equals(
    "history parent completion matches detail record",
    history.todo.is_completed,
    todo.is_completed,
  );
  TestValidator.equals(
    "history parent start date matches detail record",
    history.todo.start_at,
    todo.start_at,
  );
  TestValidator.equals(
    "history parent due date matches detail record",
    history.todo.due_at,
    todo.due_at,
  );
  TestValidator.equals(
    "history editedAt preserved",
    typeof history.editedAt,
    "string",
  );
  TestValidator.equals(
    "history title snapshot preserved",
    history.title,
    history.title,
  );
  TestValidator.equals(
    "history description snapshot preserved",
    history.description,
    history.description,
  );
  TestValidator.equals(
    "history startAt snapshot preserved",
    history.startAt,
    history.startAt,
  );
  TestValidator.equals(
    "history dueAt snapshot preserved",
    history.dueAt,
    history.dueAt,
  );
}
