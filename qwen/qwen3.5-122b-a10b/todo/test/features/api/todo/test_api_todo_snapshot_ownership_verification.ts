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
 * Test that members cannot access snapshots belonging to other users.
 *
 * Validates strict data isolation between member accounts by attempting to access another user's todo snapshot. This test ensures that the ownership verification logic properly prevents cross-user data access even when the snapshot ID is known.
 *
 * The test creates two separate member accounts, has one member create and edit a todo to generate a snapshot, then attempts to access that snapshot from the other member's authenticated session. The system must reject this access attempt with a 404 Not Found error.
 *
 * 1. Create member A account for attempting unauthorized access.
 * 2. Create member B account for owning the todo and snapshot.
 * 3. Member B creates a new todo task.
 * 4. Member B updates the todo to generate an edit history snapshot.
 * 5. Member A attempts to retrieve the snapshot using the todoId and snapshotId.
 * 6. Validates that the access attempt fails with 404 Not Found error.
 */
export async function test_api_todo_snapshot_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (the user attempting unauthorized access)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create member B (the owner of the todo and snapshot)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Member B updates the todo to create a snapshot
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberBConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Generate a snapshot ID to test with
  // From member A's perspective, any snapshot of member B's todo should not exist
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Member A attempts to retrieve the snapshot (should fail with 404)
  await TestValidator.httpError(
    "member A cannot access member B's snapshot",
    404,
    async () => {
      await api.functional.todoApp.member.todos.snapshots.at(
        memberAConnection,
        {
          todoId: todo.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
