import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test ownership validation by attempting to retrieve a snapshot from a todo
 * that does not belong to the authenticated user.
 *
 * Create two separate member accounts. Have the first member create a todo
 * and snapshot. Then authenticate as the second member and attempt to retrieve
 * the snapshot using the first member's todo and snapshot IDs. Verify the
 * system correctly rejects the request with appropriate authorization error,
 * ensuring data isolation between member accounts.
 */
export async function test_api_todo_snapshot_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuth = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(firstMemberAuth);
  // Step 2: Create second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // Step 3: Create todo under first member's account
  const todo = await generate_random_multi_user_todo_member_todos_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 4: Create snapshot of the todo
  const snapshot =
    await api.functional.multiUserTodo.member.todos.snapshots.create(
      firstMemberConnection,
      {
        todoId: todo.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(snapshot);
  // Step 5: Attempt unauthorized access - second member tries to access first member's snapshot
  await TestValidator.error(
    "should reject unauthorized snapshot access",
    async () => {
      await api.functional.multiUserTodo.member.todos.snapshots.at(
        secondMemberConnection,
        {
          todoId: todo.id as string & tags.Format<"uuid">,
          snapshotId: snapshot.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // Step 6: Verify proper owner can access their own snapshot
  const retrievedSnapshot =
    await api.functional.multiUserTodo.member.todos.snapshots.at(
      firstMemberConnection,
      {
        todoId: todo.id as string & tags.Format<"uuid">,
        snapshotId: snapshot.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(retrievedSnapshot);
  TestValidator.equals(
    "owner should retrieve correct snapshot",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot title matches original todo",
    retrievedSnapshot.title,
    todo.title,
  );
}
