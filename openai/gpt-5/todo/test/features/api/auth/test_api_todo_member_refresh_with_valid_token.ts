import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberRefresh";

/**
 * Validate token renewal for todoMember using a valid refresh token.
 *
 * Business flow:
 *
 * 1. Register (join) a fresh todoMember account and capture initial tokens
 * 2. Refresh with the valid refresh token and verify identity continuity and
 *    activity
 * 3. Detect rotation behavior by attempting refresh with the old refresh token
 *
 *    - If it errors, rotation is enforced (old token invalidated)
 *    - If it succeeds, rotation is not enforced
 * 4. Refresh again using the latest valid refresh token to validate continuity
 *
 * Notes:
 *
 * - Do not manipulate connection.headers; SDK handles tokens
 * - Validate structures with typia.assert only; assert business expectations with
 *   TestValidator
 * - Always use exact DTO variants with `satisfies` for request bodies
 */
export async function test_api_todo_member_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1) Register a fresh member (dependency: join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const authorized1 = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized1);

  const oldAccess: string = authorized1.token.access;
  const oldRefresh: string = authorized1.token.refresh;

  // 2) Refresh with the valid refresh token
  const refreshBody1 = {
    refresh_token: oldRefresh,
  } satisfies ITodoListTodoMemberRefresh.ICreate;
  const authorized2 = await api.functional.auth.todoMember.refresh(connection, {
    body: refreshBody1,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized2);

  // Identity continuity
  TestValidator.equals(
    "member id should remain the same after refresh",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.equals(
    "member email should remain the same after refresh",
    authorized2.email,
    authorized1.email,
  );

  // Active status (deleted_at null or undefined)
  TestValidator.predicate(
    "member remains active after refresh (deleted_at is null or undefined)",
    authorized2.deleted_at === null || authorized2.deleted_at === undefined,
  );

  // Token issuance checks
  TestValidator.notEquals(
    "access token should be re-issued and differ from the previous access token",
    authorized2.token.access,
    oldAccess,
  );
  const refreshRotated: boolean = authorized2.token.refresh !== oldRefresh;

  // 3) Rotation policy detection: try using the old refresh token again
  let rotationEnforced = false;
  try {
    const authorizedUsingOld = await api.functional.auth.todoMember.refresh(
      connection,
      {
        body: {
          refresh_token: oldRefresh,
        } satisfies ITodoListTodoMemberRefresh.ICreate,
      },
    );
    typia.assert<ITodoListTodoMember.IAuthorized>(authorizedUsingOld);
  } catch (_err) {
    rotationEnforced = true;
  }

  if (refreshRotated) {
    // If server rotated the refresh token, the old one is expected to be invalid
    TestValidator.predicate(
      "old refresh token becomes invalid after rotation",
      rotationEnforced === true,
    );
  } else {
    // If server did not rotate, the old refresh token may still be valid
    TestValidator.predicate(
      "old refresh token remains valid when rotation is not enforced",
      rotationEnforced === false,
    );
  }

  // 4) Validate continuity using the latest valid refresh token
  const latestRefresh: string = rotationEnforced
    ? authorized2.token.refresh // rotation enforced => old invalid, use new
    : authorized2.token.refresh; // no rotation => latest returned is still valid

  const authorized3 = await api.functional.auth.todoMember.refresh(connection, {
    body: {
      refresh_token: latestRefresh,
    } satisfies ITodoListTodoMemberRefresh.ICreate,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized3);

  TestValidator.equals(
    "member id remains the same after consecutive refresh",
    authorized3.id,
    authorized2.id,
  );
  TestValidator.predicate(
    "member remains active after consecutive refresh",
    authorized3.deleted_at === null || authorized3.deleted_at === undefined,
  );

  TestValidator.notEquals(
    "access token should change again on subsequent refresh",
    authorized3.token.access,
    authorized2.token.access,
  );
}
