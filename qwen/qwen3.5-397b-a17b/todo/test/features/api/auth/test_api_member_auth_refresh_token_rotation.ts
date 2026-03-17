import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token rotation behavior during refresh operation to verify security best practices.
 *
 * This test validates:
 * 1. Member registration and initial token acquisition
 * 2. Successful token refresh with valid refresh token
 * 3. New access and refresh tokens are issued after refresh
 * 4. Old refresh token is invalidated after rotation (security requirement)
 * 5. New tokens work correctly for continued application usage
 */
export async function test_api_member_auth_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token exists",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is valid date",
    new Date(initialExpiredAt).getTime() > 0,
  );
  TestValidator.predicate(
    "initial refreshable_until is valid date",
    new Date(initialRefreshableUntil).getTime() > 0,
  );
  // 2. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  // Set the initial access token for authorization header
  refreshConnection.headers = { Authorization: initialAccessToken };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are issued after refresh
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  const newExpiredAt = refreshedAuth.token.expired_at;
  const newRefreshableUntil = refreshedAuth.token.refreshable_until;
  // Verify tokens have changed (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // Verify new tokens are valid
  TestValidator.predicate("new access token exists", newAccessToken.length > 0);
  TestValidator.predicate(
    "new refresh token exists",
    newRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "new expired_at is valid date",
    new Date(newExpiredAt).getTime() > 0,
  );
  TestValidator.predicate(
    "new refreshable_until is valid date",
    new Date(newRefreshableUntil).getTime() > 0,
  );
  // 4. Attempt to use old refresh token again - should be rejected
  const retryRefreshConnection: api.IConnection = { host: connection.host };
  retryRefreshConnection.headers = { Authorization: newAccessToken };
  await TestValidator.error(
    "old refresh token rejected after rotation",
    async () => {
      await api.functional.todoApp.auth.member.refresh(retryRefreshConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // 5. Validate member info remains consistent after refresh
  TestValidator.equals("member id unchanged", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "member email unchanged",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "display name unchanged",
    initialAuth.display_name,
    refreshedAuth.display_name,
  );
  // 6. Confirm member can continue using application with new tokens
  // Create a new connection with the new access token to verify it works
  const validatedConnection: api.IConnection = { host: connection.host };
  validatedConnection.headers = { Authorization: newAccessToken };
  // Perform another refresh with the new refresh token to confirm it's active
  const finalRefreshConnection: api.IConnection = { host: connection.host };
  finalRefreshConnection.headers = { Authorization: newAccessToken };
  const finalAuth = await authorize_member_refresh(finalRefreshConnection, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(finalAuth);
  // Verify final tokens are also rotated
  TestValidator.notEquals(
    "final access token differs from previous",
    newAccessToken,
    finalAuth.token.access,
  );
  TestValidator.notEquals(
    "final refresh token differs from previous",
    newRefreshToken,
    finalAuth.token.refresh,
  );
  // Verify member identity remains consistent throughout all operations
  TestValidator.equals(
    "member id consistent through all refreshes",
    initialAuth.id,
    finalAuth.id,
  );
  TestValidator.equals(
    "member email consistent through all refreshes",
    initialAuth.email,
    finalAuth.email,
  );
}
