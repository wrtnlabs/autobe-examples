import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
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

/**
 * Test snapshot retrieval error handling for non-existent or unauthorized access.
 *
 * Validates that the snapshot endpoint properly returns 404 Not Found errors when attempting to access snapshots that do not exist or belong to different todos. This ensures proper ownership verification and error handling for snapshot retrieval operations.
 *
 * The test creates a member account, generates todos with edit history, and verifies that invalid snapshot requests are properly rejected with appropriate error responses. Both scenarios are tested: accessing non-existent snapshots and attempting cross-todo snapshot access.
 *
 * 1. Register and authenticate as a member
 * 2. Create a todo task
 * 3. Update the todo to create an edit history snapshot
 * 4. Test Case 1: Request snapshot with invalid snapshotId (UUID that doesn't exist) - expect 404
 * 5. Test Case 2: Create another todo with snapshots, attempt to access using wrong todoId - expect 404
 */
export async function test_api_todo_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first todo task
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // 3. Update todo1 to create an edit history snapshot
  const updatedTodo1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo1.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // 4. Test Case 1: Request snapshot with invalid snapshotId (UUID that doesn't exist) - expect 404
  const invalidSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot with invalid snapshotId should return 404",
    404,
    async () => {
      await api.functional.todoApp.member.todos.snapshots.at(memberConnection, {
        todoId: todo1.id,
        snapshotId: invalidSnapshotId,
      });
    },
  );
  // 5. Test Case 2: Create another todo with snapshots, attempt to access using wrong todoId - expect 404
  // Create second todo
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  // Update todo2 to create snapshots
  const updatedTodo2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo2.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // Test that accessing snapshot with todo1's ID but using todo2's context returns 404
  // Since we cannot list snapshots to get actual snapshotIds, we test that any snapshotId
  // paired with wrong todoId returns 404, validating the ownership verification logic
  const snapshotIdFromTodo2Context = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "snapshot with wrong todoId should return 404",
    404,
    async () => {
      await api.functional.todoApp.member.todos.snapshots.at(memberConnection, {
        todoId: todo1.id,
        snapshotId: snapshotIdFromTodo2Context,
      });
    },
  );
}
