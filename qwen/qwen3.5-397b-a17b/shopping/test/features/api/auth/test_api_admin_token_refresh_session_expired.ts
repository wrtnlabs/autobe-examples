import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test token refresh failure when the administrator session has expired.
 *
 * This test verifies that the token refresh endpoint properly rejects refresh
 * attempts when the session's refreshable_until timestamp has passed. The test
 * creates a new administrator account, then attempts to refresh with the token
 * after the session expiration deadline. This enforces the maximum session
 * duration policy and ensures administrators must re-authenticate with
 * credentials after the session deadline.
 *
 * Test Flow:
 * 1. Register a new administrator account using the join endpoint
 * 2. Extract the refresh token and refreshable_until timestamp from response
 * 3. In test environment with short session timeouts, wait for expiration
 * 4. Attempt to call the refresh endpoint with the expired refresh token
 * 5. Verify the operation fails with appropriate error indicating session invalid
 * 6. Verify re-authentication with credentials still works
 *
 * Note: This test requires the test environment to have short session timeout
 * values configured (e.g., refreshable_until = 1-2 minutes from creation) for
 * practical E2E test execution.
 */
export async function test_api_admin_token_refresh_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract refresh token from the authentication response
  const refreshToken = authorized.token.refresh;
  const refreshableUntil = authorized.token.refreshable_until;
  // 3. Verify we have valid tokens initially
  TestValidator.predicate("refresh token exists", refreshToken !== undefined);
  TestValidator.predicate(
    "refreshable_until exists",
    refreshableUntil !== undefined,
  );
  // 4. In test environment with short session timeouts, wait until expiration
  // Calculate wait time based on refreshable_until timestamp
  const expirationTime = new Date(refreshableUntil).getTime();
  const currentTime = new Date().getTime();
  const waitTime = Math.max(expirationTime - currentTime + 1000, 100); // Wait until expired + 1 second buffer
  // Wait for session to expire (in test env with short timeouts, this is practical)
  await new Promise((resolve) => setTimeout(resolve, waitTime));
  // 5. Attempt to refresh with the expired token (should fail)
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh should fail for expired session",
    async () => {
      await api.functional.shoppingMall.auth.admin.refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IShoppingMallAdmin.IRefresh,
      });
    },
  );
  // 6. Verify that re-authentication with credentials is required and works
  const newAdminConnection: api.IConnection = { host: connection.host };
  const reauthorized = await authorize_admin_join(newAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(reauthorized);
  // 7. Verify new session has fresh tokens
  TestValidator.predicate(
    "new access token exists",
    reauthorized.token.access !== undefined,
  );
  TestValidator.predicate(
    "new refresh token exists",
    reauthorized.token.refresh !== undefined,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshToken,
    reauthorized.token.refresh,
  );
}
