import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_history_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create a todo to establish user ownership context
  await api.functional.todoApp.user.todos.create(userConnection);
  // Test the field change retrieval endpoint with valid UUID parameters
  // This validates that the endpoint properly handles the request structure
  // and returns a valid ITodoAppTodoHistoryChange object
  const change = await api.functional.todoApp.user.todos.histories.changes.at(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
      historyId: typia.random<string & tags.Format<"uuid">>(),
      changeId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // typia.assert performs complete runtime validation including:
  // - All property existence checks
  // - All type checks (string, number, etc.)
  // - All format validations (UUID, date-time)
  // - All constraint validations
  typia.assert(change);
}
