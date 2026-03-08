import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful admin token refresh workflow.
 * Validates complete token refresh lifecycle including token invalidation
 * and new token functionality verification.
 */
export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration - create account and get initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  // Extract refresh token for subsequent refresh test
  const initialRefreshToken = initialAuth.token.refresh;
  const initialAdminId = initialAuth.id;
  // 2. Call refresh endpoint with valid refresh token
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(adminRefreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // 3. Verify response contains new token pair
  TestValidator.notEquals(
    "refresh response has access token",
    refreshedAuth.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh response has refresh token",
    refreshedAuth.token.refresh,
    "",
  );
  TestValidator.notEquals(
    "refresh response has expired_at",
    refreshedAuth.token.expired_at,
    "",
  );
  TestValidator.notEquals(
    "refresh response has refreshable_until",
    refreshedAuth.token.refreshable_until,
    "",
  );
  // 4. Validate admin identity information preserved after refresh
  TestValidator.equals("admin id preserved", refreshedAuth.id, initialAdminId);
  TestValidator.equals(
    "admin email preserved",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "admin username preserved",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "admin display_name preserved",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "admin is_active preserved",
    refreshedAuth.is_active,
    initialAuth.is_active,
  );
  // 5. Verify old refresh token is invalidated
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token is invalidated", async () => {
    await authorize_admin_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      },
    });
  });
  // 6. Verify new refresh token can be used for another refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshedAuth = await authorize_admin_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: refreshedAuth.token.refresh,
      },
    },
  );
  typia.assert(secondRefreshedAuth);
  TestValidator.equals(
    "second refresh has valid access token",
    secondRefreshedAuth.token.access !== "",
    true,
  );
  // 7. Validate identity preserved through multiple refreshes
  TestValidator.equals(
    "second refresh id preserved",
    secondRefreshedAuth.id,
    initialAdminId,
  );
}