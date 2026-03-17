import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful refresh of admin authentication tokens.
 *
 * 1. Create admin account via join to get initial tokens
 * 2. Use refresh token to obtain new tokens via refresh endpoint
 * 3. Validate new tokens are issued with admin identity info
 * 4. Confirm new tokens can be used for authenticated requests
 */
export async function test_api_admin_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // Store initial tokens for comparison
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  const initialExpiredAt = joinResult.token.expired_at;
  const initialRefreshableUntil = joinResult.token.refreshable_until;
  // 2. Use refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate new tokens are different
  TestValidator.notEquals(
    "access token should be renewed",
    refreshResult.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshResult.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate admin identity consistency
  TestValidator.equals(
    "admin id should remain the same",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "admin email should remain the same",
    refreshResult.email,
    joinResult.email,
  );
  // 5. Validate token expiration times are updated
  TestValidator.notEquals(
    "expired_at should be updated",
    refreshResult.token.expired_at,
    initialExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated",
    refreshResult.token.refreshable_until,
    initialRefreshableUntil,
  );
  // 6. Validate that new tokens can be used for authenticated requests
  // The refreshConnection now has the new access token in its headers
  // We can verify the connection is properly authenticated by checking headers
  TestValidator.predicate(
    "connection should have authorization header",
    () =>
      refreshConnection.headers !== undefined &&
      refreshConnection.headers.Authorization !== undefined &&
      refreshConnection.headers.Authorization === refreshResult.token.access,
  );
  // 7. Validate token structure
  TestValidator.predicate(
    "access token should be non-empty string",
    () => refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    () => refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be valid ISO date",
    () => !isNaN(Date.parse(refreshResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO date",
    () => !isNaN(Date.parse(refreshResult.token.refreshable_until)),
  );
  // 8. Validate that expired_at is earlier than refreshable_until (token lifecycle)
  const expiredAtDate = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at should be before refreshable_until",
    () => expiredAtDate < refreshableUntilDate,
  );
}
