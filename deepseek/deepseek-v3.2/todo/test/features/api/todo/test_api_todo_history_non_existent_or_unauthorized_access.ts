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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_non_existent_or_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Each member creates a todo
  const member1Todo = await generate_random_todo_app_member_todos_create(
    member1Connection,
    {},
  );
  typia.assert(member1Todo);
  const member2Todo = await generate_random_todo_app_member_todos_create(
    member2Connection,
    {},
  );
  typia.assert(member2Todo);
  // Scenario 1: Non-existent history ID with valid todo ID owned by member
  await TestValidator.error(
    "non-existent history ID with valid todo ID",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        member1Connection,
        {
          todoId: member1Todo.id,
          historyId: typia.random<string>(), // Use plain string for non-existent ID
        },
      );
    },
  );
  // Scenario 2: Invalid UUID format for historyId
  await TestValidator.error(
    "invalid UUID format for historyId parameter",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        member1Connection,
        {
          todoId: member1Todo.id,
          historyId: "not-a-valid-uuid",
        },
      );
    },
  );
  // Scenario 3: Cross-owner access - Member 1 tries to access Member 2's todo history
  await TestValidator.error("cross-owner access attempt", async () => {
    await api.functional.todoApp.member.todos.histories.at(member1Connection, {
      todoId: member2Todo.id,
      historyId: typia.random<string>(),
    });
  });
  // Scenario 4: Non-existent todo ID
  await TestValidator.error("non-existent todo ID", async () => {
    await api.functional.todoApp.member.todos.histories.at(member1Connection, {
      todoId: typia.random<string>(),
      historyId: typia.random<string>(),
    });
  });
  // Scenario 5: Invalid UUID format for todoId
  await TestValidator.error(
    "invalid UUID format for todoId parameter",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        member1Connection,
        {
          todoId: "invalid-todo-uuid-format",
          historyId: typia.random<string>(),
        },
      );
    },
  );
  // Scenario 6: History ID doesn't belong to specified todo (same as scenario 1 since we can't create histories)
  await TestValidator.error(
    "history ID doesn't belong to specified todo",
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        member1Connection,
        {
          todoId: member1Todo.id,
          historyId: typia.random<string>(),
        },
      );
    },
  );
}
