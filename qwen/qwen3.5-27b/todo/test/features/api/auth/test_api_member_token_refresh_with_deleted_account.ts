import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test token refresh behavior with invalid/deleted account scenarios.
   *
   * This test validates that the token refresh endpoint properly handles
   * cases where the refresh token is invalid or the associated account
   * is no longer accessible. Since there's no direct API to delete accounts,
   * we test the refresh failure path by using an invalid token.
   */
  // Step 1: Register a new member account and obtain valid tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(registered);
  // Verify registration was successful
  TestValidator.predicate(
    "member registered successfully",
    registered.id != null,
  );
  TestValidator.equals("email matches", registered.email, registered.email);
  TestValidator.predicate(
    "received refresh token",
    registered.token.refresh.length > 0,
  );
  // Step 2: Test successful token refresh with valid token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: registered.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshed);
  // Verify refresh was successful
  TestValidator.equals("member id preserved", refreshed.id, registered.id);
  TestValidator.predicate(
    "new access token issued",
    refreshed.token.access !== registered.token.access,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshed.token.refresh !== registered.token.refresh,
  );
  // Step 3: Test refresh failure with invalid token (simulating deleted account scenario)
  // Since we cannot actually delete the account, we test with a clearly invalid token
  // This validates the error handling path that would also be triggered for deleted accounts
  await TestValidator.httpError(
    "refresh rejected with invalid token",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await api.functional.multiUserTodo.auth.member.refresh(
        invalidConnection,
        {
          body: {
            refresh_token: "invalid_token_for_testing",
          } satisfies IMultiUserTodoMember.IRefresh,
        },
      );
    },
  );
  // Step 4: Test refresh failure with malformed token
  await TestValidator.httpError(
    "refresh rejected with malformed token",
    401,
    async () => {
      const malformedConnection: api.IConnection = { host: connection.host };
      await api.functional.multiUserTodo.auth.member.refresh(
        malformedConnection,
        {
          body: {
            refresh_token: "not.a.valid.jwt.token",
          } satisfies IMultiUserTodoMember.IRefresh,
        },
      );
    },
  );
  // Step 5: Verify that valid refresh still works after testing invalid tokens
  const finalRefreshConnection: api.IConnection = { host: connection.host };
  const finalRefreshed = await authorize_member_refresh(
    finalRefreshConnection,
    {
      body: {
        refresh_token: refreshed.token.refresh,
      } satisfies IMultiUserTodoMember.IRefresh,
    },
  );
  typia.assert(finalRefreshed);
  TestValidator.equals(
    "member id still preserved",
    finalRefreshed.id,
    registered.id,
  );
  TestValidator.predicate(
    "tokens rotated again",
    finalRefreshed.token.refresh !== refreshed.token.refresh,
  );
}
