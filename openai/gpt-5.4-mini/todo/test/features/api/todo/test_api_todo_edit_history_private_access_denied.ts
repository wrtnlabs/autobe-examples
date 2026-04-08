import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member cannot access another member's private todo edit history.
   *
   * This scenario validates that edit history resources are scoped to the owning
   * member only. It creates a todo under one authenticated member, then attempts
   * to read a history entry from a different authenticated member and confirms
   * the request is rejected. The owner connection is then used again to ensure
   * the todo history remains readable for the rightful owner after the denied
   * access attempt.
   *
   * 1. Member A signs up and creates a todo.
   * 2. Member A updates the todo so a history entry exists.
   * 3. Member B signs up using a separate connection.
   * 4. Member B attempts to fetch Member A's history entry and is denied.
   * 5. Member A can still access the same history entry afterward.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "Password123!" satisfies string,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(owner);
  const todo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: new Date(Date.now() + 60000).toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const editedTodo = await api.functional.todoApp.member.todos.create(
    ownerConnection,
    {
      body: {
        title: `${todo.title} updated`,
        description: todo.description,
        startDate: todo.startDate,
        dueDate: todo.dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(editedTodo);
  const ownerHistory =
    await api.functional.todoApp.member.todos.editHistories.at(
      ownerConnection,
      {
        todoId: todo.id,
        editHistoryId: editedTodo.id,
      },
    );
  typia.assert(ownerHistory);
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_member_join(otherConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}_other@test.com` satisfies string,
      password: "Password123!" satisfies string,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(other);
  await TestValidator.httpError(
    "private edit history access is denied to another member",
    [401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        otherConnection,
        {
          todoId: todo.id,
          editHistoryId: ownerHistory.id,
        },
      );
    },
  );
  const ownerHistoryAgain =
    await api.functional.todoApp.member.todos.editHistories.at(
      ownerConnection,
      {
        todoId: todo.id,
        editHistoryId: ownerHistory.id,
      },
    );
  typia.assert(ownerHistoryAgain);
  TestValidator.equals(
    "owner still sees the same history entry",
    ownerHistoryAgain.id,
    ownerHistory.id,
  );
}
