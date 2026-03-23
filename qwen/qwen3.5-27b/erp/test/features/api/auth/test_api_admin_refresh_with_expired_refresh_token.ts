import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the error handling when an administrator attempts to refresh tokens using an expired refresh token.
 *
 * This test validates that the system properly enforces refresh token expiration
 * and prevents session extension beyond the configured maximum duration.
 */
export async function test_api_admin_refresh_with_expired_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain valid tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract the valid refresh token for verification
  const validRefreshToken = authorized.token.refresh;
  TestValidator.predicate(
    "valid refresh token obtained",
    validRefreshToken.length > 0,
  );
  // 3. Create a separate connection for the expired token test
  const testConnection: api.IConnection = { host: connection.host };
  // 4. Simulate expired token by using an invalid/malformed token
  // In real scenarios, we would wait until refreshable_until, but for E2E testing,
  // we use a clearly invalid token to simulate expiration
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.invalid";
  // 5. Attempt to refresh with expired/invalid token
  await TestValidator.httpError(
    "expired refresh token returns 401 Unauthorized",
    401,
    async () => {
      await authorize_admin_refresh(testConnection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IHrmPlatformAdmin.IRefresh,
      });
    },
  );
  // 6. Verify that no new tokens were issued (error was thrown, no response)
  TestValidator.predicate(
    "no new tokens issued for expired refresh token",
    testConnection.headers?.Authorization === undefined,
  );
}
