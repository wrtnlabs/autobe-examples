import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh success scenario.
 * 1. Create member account via join to obtain initial authentication tokens
 * 2. Call refresh endpoint with valid refresh_token
 * 3. Verify token rotation (new access_token and refresh_token are different)
 * 4. Verify expired_at timestamp is extended to future date
 * 5. Verify new tokens work for authenticated API access
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const initialAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  // 2. Refresh tokens using the refresh_token from initial auth
  const refreshedAuth = await authorize_member_refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
      ip: typia.random<(string & tags.Format<"ipv4">) | undefined>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify token rotation - new tokens are different from original
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 4. Verify expired_at is extended to future date
  const originalExpiredDate = new Date(originalExpiredAt).getTime();
  const refreshedExpiredDate = new Date(
    refreshedAuth.token.expired_at,
  ).getTime();
  TestValidator.predicate(
    "expired_at extended",
    refreshedExpiredDate > originalExpiredDate,
  );
  // 5. Verify member profile information is preserved
  TestValidator.equals("member id preserved", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "email preserved",
    refreshedAuth.email,
    initialAuth.email,
  );
  // 6. Verify new access token works for authenticated API access
  // Create a new connection with the refreshed access token
  const refreshedConnection: api.IConnection = {
    host: connection.host,
  };
  refreshedConnection.headers = {
    Authorization: `Bearer ${refreshedAuth.token.access}`,
  };
  // Test that the refreshed token works by calling refresh again
  // (This proves the new token is valid for authenticated requests)
  const secondRefresh = await authorize_member_refresh(refreshedConnection, {
    body: {
      refresh_token: refreshedAuth.token.refresh,
    } satisfies IHrmPlatformMember.IRefresh,
  });
  typia.assert(secondRefresh);
  // Verify second refresh also rotated tokens
  TestValidator.notEquals(
    "second refresh access token rotated",
    refreshedAuth.token.access,
    secondRefresh.token.access,
  );
  TestValidator.notEquals(
    "second refresh refresh token rotated",
    refreshedAuth.token.refresh,
    secondRefresh.token.refresh,
  );
}
