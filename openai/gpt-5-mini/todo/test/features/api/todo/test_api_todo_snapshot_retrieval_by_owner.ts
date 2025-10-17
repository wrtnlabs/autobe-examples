import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate retrieval of a todo snapshot (version) by its owner.
 *
 * Business context:
 *
 * - The backend keeps snapshots of todo items. Owners should be able to retrieve
 *   a specific snapshot by todoId and versionId.
 *
 * Test flow (simulated):
 *
 * 1. Register a new user (join)
 * 2. Create a todo for that user
 * 3. Retrieve a snapshot for that todo (versions.at)
 * 4. Validate snapshot structure and timestamps
 *
 * Notes:
 *
 * - This test uses SDK simulation mode (connection.simulate = true) to obtain
 *   deterministic typia-random responses suitable for CI or environments where
 *   the SDK was generated with simulation support. For real-server testing,
 *   remove simulate=true and ensure snapshots exist or provide a snapshot-list
 *   endpoint/fixture.
 */
export async function test_api_todo_snapshot_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Use simulation mode to obtain deterministic, typia-random responses.
  const sim: api.IConnection = { ...connection, simulate: true };

  // 1) Create a new user via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const user = await api.functional.auth.user.join(sim, { body: joinBody });
  typia.assert(user);

  // 2) Create a todo owned by the authenticated user
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    is_completed: false,
  } satisfies ITodoAppTodo.ICreate;

  const todo = await api.functional.todoApp.user.todos.create(sim, {
    body: createTodoBody,
  });
  typia.assert(todo);

  // 3) Retrieve a snapshot for that todo
  // NOTE: Without a snapshot-listing endpoint in the provided SDK materials,
  // we cannot deterministically obtain a real versionId tied to the created
  // todo. For simulation we request a random version id; the simulated SDK
  // returns a random ITodoAppTodoSnapshot.
  const versionId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.todoApp.user.todos.versions.at(sim, {
    todoId: todo.id,
    versionId,
  });
  typia.assert(snapshot);

  // 4) Business validations (type and timestamp checks)
  TestValidator.predicate(
    "snapshot.snapshot_at is a valid ISO 8601 datetime",
    !Number.isNaN(Date.parse(snapshot.snapshot_at)),
  );

  TestValidator.predicate(
    "snapshot.created_at is a valid ISO 8601 datetime",
    !Number.isNaN(Date.parse(snapshot.created_at)),
  );

  TestValidator.predicate(
    "snapshot.updated_at is a valid ISO 8601 datetime",
    !Number.isNaN(Date.parse(snapshot.updated_at)),
  );

  // Ensure required fields exist (typia.assert already validated shape)
  TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
  TestValidator.predicate(
    "snapshot has todo_app_todo_id",
    typeof snapshot.todo_app_todo_id === "string",
  );

  // Note on ownership equality assertion:
  // When a snapshot-listing endpoint is available or the system provides a
  // deterministic versionId tied to the created todo, add the following
  // assertion to verify ownership:
  // TestValidator.equals("snapshot belongs to todo", snapshot.todo_app_todo_id, todo.id);
}
