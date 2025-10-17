import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberRestore } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRestore";

/**
 * Restore a deactivated todoMember account and verify re-enabled access.
 *
 * Business goal:
 *
 * - Ensure that a member who has deactivated their account can self-restore and
 *   continue performing authenticated operations without re-login.
 *
 * End-to-end steps:
 *
 * 1. Join (register) a new todoMember to establish an authenticated session.
 * 2. Deactivate the account and confirm success.
 * 3. Restore the account and confirm success.
 *
 *    - Validate temporal ordering: restore.at >= deactivate.at.
 * 4. Verify access after restoration by invoking another authenticated endpoint
 *    (deactivate) successfully, then restore again to leave the account
 *    active.
 *
 * Important notes:
 *
 * - Only provided APIs are used: join, deactivate, restore.
 * - No assumption on additional member-only endpoints; access verification is
 *   performed by successfully calling another authenticated security
 *   operation.
 * - No direct header manipulation; SDK manages Authorization automatically.
 */
export async function test_api_todo_member_account_restoration_reenables_authorized_access(
  connection: api.IConnection,
) {
  // 1) Join to establish authenticated context
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    email,
    password,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Basic business sanity checks on join result
  TestValidator.predicate(
    "deleted_at should be null or undefined on newly joined (active) member",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // 2) Deactivate current account
  const deactivateBody1 = {
    reason: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoListTodoMemberDeactivate.ICreate;
  const deactivated1: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.deactivate(connection, {
      body: deactivateBody1,
    });
  typia.assert(deactivated1);
  TestValidator.predicate(
    "deactivation should succeed",
    deactivated1.success === true,
  );

  // 3) Restore account
  const restoreBody1 = {
    reason: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITodoListTodoMemberRestore.ICreate;
  const restored1: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.restore(connection, {
      body: restoreBody1,
    });
  typia.assert(restored1);
  TestValidator.predicate(
    "restoration should succeed",
    restored1.success === true,
  );

  // Validate temporal ordering: restore.at should be >= deactivate.at
  const deactivatedAtMs: number = new Date(deactivated1.at).getTime();
  const restoredAtMs: number = new Date(restored1.at).getTime();
  TestValidator.predicate(
    "restoration timestamp is not earlier than deactivation timestamp",
    restoredAtMs >= deactivatedAtMs,
  );

  // 4) Verify access after restoration by performing another authenticated operation
  const deactivateBody2 = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListTodoMemberDeactivate.ICreate;
  const deactivated2: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.deactivate(connection, {
      body: deactivateBody2,
    });
  typia.assert(deactivated2);
  TestValidator.predicate(
    "post-restore deactivation should also succeed (indicates re-enabled access)",
    deactivated2.success === true,
  );

  // Leave account active at the end of the test for cleanliness
  const restoreBody2 = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoListTodoMemberRestore.ICreate;
  const restored2: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.restore(connection, {
      body: restoreBody2,
    });
  typia.assert(restored2);
  TestValidator.predicate(
    "final restoration should succeed",
    restored2.success === true,
  );
}
