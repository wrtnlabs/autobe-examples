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
 * Test token rotation behavior when multiple refresh requests are made sequentially.
 *
 * This test validates the token lifecycle management and refresh token rotation policy:
 * 1. Register a member account and obtain initial authentication tokens
 * 2. Perform first refresh request successfully using the initial refresh token
 * 3. Immediately perform a second refresh request using the new refresh token from first refresh
 * 4. Verify both refresh operations succeed and each returns a new token pair
 * 5. Validate that each new refresh token replaces the previous one
 * 6. Test that the old refresh token from before the first refresh is invalidated
 */
export async function test_api_member_token_refresh_multiple_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial refresh token
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Perform first refresh request
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh: initialRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  // Validate first refresh returned new tokens
  TestValidator.notEquals(
    "first refresh returns new access token",
    initialAuth.token.access,
    firstRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "first refresh returns new refresh token",
    initialAuth.token.refresh,
    firstRefreshAuth.token.refresh,
  );
  // 3. Perform second refresh request using the refresh token from first refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh: firstRefreshAuth.token.refresh,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Validate second refresh returned new tokens
  TestValidator.notEquals(
    "second refresh returns new access token",
    firstRefreshAuth.token.access,
    secondRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "second refresh returns new refresh token",
    firstRefreshAuth.token.refresh,
    secondRefreshAuth.token.refresh,
  );
  // 4. Validate token rotation - each refresh should produce unique tokens
  TestValidator.notEquals(
    "all access tokens are unique",
    initialAuth.token.access,
    secondRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "all refresh tokens are unique",
    initialAuth.token.refresh,
    secondRefreshAuth.token.refresh,
  );
  // 5. Validate member identity remains consistent across refreshes
  TestValidator.equals(
    "member id consistent",
    initialAuth.id,
    firstRefreshAuth.id,
  );
  TestValidator.equals(
    "member id consistent after second refresh",
    initialAuth.id,
    secondRefreshAuth.id,
  );
  TestValidator.equals(
    "member email consistent",
    initialAuth.email,
    firstRefreshAuth.email,
  );
  TestValidator.equals(
    "member email consistent after second refresh",
    initialAuth.email,
    secondRefreshAuth.email,
  );
  // 6. Test that old refresh token is invalidated (attempt to use initial token again)
  const invalidatedTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token is invalidated", async () => {
    await authorize_member_refresh(invalidatedTokenConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
}
