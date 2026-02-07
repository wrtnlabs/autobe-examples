import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import type { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_history_snapshot_retrieval_complete_state(
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
  // Create a todo (endpoint returns void, so no response to validate)
  await api.functional.todoApp.user.todos.create(userConnection);
  // Since we cannot create/edit todos to generate history with available endpoints,
  // and the snapshot retrieval requires specific todoId, historyId, and snapshotId,
  // we need to test the endpoint with valid-looking UUIDs to validate the response structure
  // Generate valid UUIDs for testing the endpoint
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Test the snapshot retrieval endpoint with the generated IDs
  const snapshot =
    await api.functional.todoApp.user.todos.histories.snapshots.at(
      userConnection,
      {
        todoId,
        historyId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate the complete snapshot structure
  TestValidator.equals("snapshot has correct ID", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot has title field",
    typeof snapshot.title === "string",
  );
  TestValidator.predicate(
    "snapshot has description field",
    snapshot.description !== undefined,
  );
  TestValidator.predicate(
    "snapshot has start_date field",
    snapshot.start_date !== undefined,
  );
  TestValidator.predicate(
    "snapshot has due_date field",
    snapshot.due_date !== undefined,
  );
  TestValidator.predicate(
    "snapshot has is_completed field",
    typeof snapshot.is_completed === "boolean",
  );
  // Validate parent snapshot metadata structure
  TestValidator.equals(
    "snapshot links to correct parent snapshot",
    snapshot.snapshot.id,
    historyId,
  );
  TestValidator.predicate(
    "parent snapshot has snapshot_created_at timestamp",
    typeof snapshot.snapshot.snapshot_created_at === "string",
  );
  TestValidator.predicate(
    "parent snapshot has created_at timestamp",
    typeof snapshot.snapshot.created_at === "string",
  );
  // Validate todo reference structure
  TestValidator.equals(
    "snapshot links to correct todo",
    snapshot.todo.id,
    todoId,
  );
  TestValidator.predicate(
    "todo reference has title",
    typeof snapshot.todo.title === "string",
  );
  TestValidator.predicate(
    "todo reference has created_at timestamp",
    typeof snapshot.todo.created_at === "string",
  );
  TestValidator.predicate(
    "todo reference has user information",
    snapshot.todo.user !== undefined,
  );
  TestValidator.predicate(
    "todo reference has completion status",
    typeof snapshot.todo.is_completed === "boolean",
  );
  TestValidator.predicate(
    "todo user has id",
    typeof snapshot.todo.user.id === "string",
  );
  TestValidator.predicate(
    "todo user has email",
    typeof snapshot.todo.user.email === "string",
  );
  TestValidator.predicate(
    "todo user has display_name",
    typeof snapshot.todo.user.display_name === "string",
  );
  TestValidator.predicate(
    "todo user has created_at timestamp",
    typeof snapshot.todo.user.created_at === "string",
  );
}
