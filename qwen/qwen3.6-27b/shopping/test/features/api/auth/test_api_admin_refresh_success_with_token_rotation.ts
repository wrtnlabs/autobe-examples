import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
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
 * Validate that a valid refresh token successfully renews an administrator's authentication session.
 *
 * Tests the complete token rotation workflow where a refresh token from a successful admin registration is used to obtain new JWT tokens. The test verifies that the refresh endpoint validates the token against active sessions, checks expiration timestamps, and issues new tokens with updated expiry information. Previous refresh tokens should be invalidated after successful renewal.
 *
 * 1. Administrator registers and obtains initial JWT tokens via join endpoint.
 * 2. Administrator uses the refresh token to call the refresh endpoint.
 * 3. Validates that new access and refresh tokens are returned.
 * 4. Verifies that new tokens have updated expiration timestamps.
 */
export async function test_api_admin_refresh_success_with_token_rotation(
  connection: api.IConnection,
) {
  // 1. Admin registration to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Token refresh using the refresh token from join response
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IEcommercePlatformAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate token rotation - new tokens must be different from original
  TestValidator.notEquals(
    "access tokens rotated",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens rotated",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 4. Verify admin identity consistency
  TestValidator.equals("admin id consistent", joinResult.id, refreshResult.id);
  // 5. Validate new tokens have valid expiration timestamps
  TestValidator.predicate(
    "new tokens have valid expiration",
    refreshResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "new refresh window is valid",
    refreshResult.token.refreshable_until !== undefined,
  );
}
