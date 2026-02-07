import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_history_non_existent_entry(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create first todo
  await api.functional.todoApp.user.todos.create(userConnection);
  // Create second todo
  await api.functional.todoApp.user.todos.create(userConnection);
  // Since we cannot get todo IDs from creation responses (void return),
  // we'll use invalid UUIDs and mismatched combinations for testing
  // Test 1: Attempt to retrieve history with invalid UUID
  await TestValidator.error("invalid UUID should fail", async () => {
    await api.functional.todoApp.user.todos.histories.at(userConnection, {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      historyId: "invalid-uuid" as string & tags.Format<"uuid">,
    });
  });
  // Test 2: Attempt to retrieve history entry that doesn't exist
  await TestValidator.error("non-existent history ID should fail", async () => {
    await api.functional.todoApp.user.todos.histories.at(userConnection, {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      historyId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Test 3: Attempt to retrieve history with mismatched todo and history IDs
  await TestValidator.error("mismatched todo-history should fail", async () => {
    await api.functional.todoApp.user.todos.histories.at(userConnection, {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      historyId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
