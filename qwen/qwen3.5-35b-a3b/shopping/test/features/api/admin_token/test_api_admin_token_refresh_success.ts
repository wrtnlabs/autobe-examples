import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account to get initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Verify admin account is active and unbanned
  TestValidator.equals("admin is not banned", adminJoinResult.isBanned, false);
  TestValidator.equals(
    "admin has no ban reason",
    adminJoinResult.banReason,
    null,
  );
  // Step 3: Store initial refresh token
  const initialRefreshToken = adminJoinResult.token.refresh;
  // Step 4: Create new connection for refresh operation
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  // Step 5: Refresh token using the initial refresh token
  const refreshResult = await authorize_admin_refresh(adminRefreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 6: Verify refresh response contains new tokens
  TestValidator.notEquals(
    "access token changed after refresh",
    adminJoinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    adminJoinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // Step 7: Verify new refresh token is different from initial
  const newRefreshToken = refreshResult.token.refresh;
  TestValidator.notEquals(
    "new refresh token differs from initial",
    initialRefreshToken,
    newRefreshToken,
  );
  // Step 8: Verify access token expiration is set
  TestValidator.predicate(
    "access token has expiration",
    refreshResult.token.expired_at !== undefined,
  );
  // Step 9: Verify refreshable_until is set
  TestValidator.predicate(
    "refresh token has expiration deadline",
    refreshResult.token.refreshable_until !== undefined,
  );
  // Step 10: Verify admin account remains active after refresh
  TestValidator.equals("admin remains unbanned", refreshResult.isBanned, false);
  TestValidator.equals(
    "admin ban reason unchanged",
    refreshResult.banReason,
    null,
  );
  // Step 11: Verify admin ID remains consistent
  TestValidator.equals(
    "admin ID unchanged after refresh",
    adminJoinResult.id,
    refreshResult.id,
  );
  // Step 12: Verify email remains consistent
  TestValidator.equals(
    "admin email unchanged after refresh",
    adminJoinResult.email,
    refreshResult.email,
  );
  // Step 13: Verify old refresh token is invalidated
  const invalidateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await authorize_admin_refresh(invalidateConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  });
  // Step 14: Test that new refresh token works
  const validateConnection: api.IConnection = { host: connection.host };
  const validateResult = await authorize_admin_refresh(validateConnection, {
    body: {
      refresh_token: newRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(validateResult);
}
