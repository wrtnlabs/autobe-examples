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

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account to obtain initial tokens
  const initialAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  // 2. Call the refresh endpoint with the valid refresh token
  const refreshedAuth = await authorize_admin_refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Extract new token information
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  const newExpiredAt = refreshedAuth.token.expired_at;
  const newRefreshableUntil = refreshedAuth.token.refreshable_until;
  // 4. Verify the new access token is different from the original (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    newAccessToken,
  );
  // 5. Verify the new refresh token is issued (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    newRefreshToken,
  );
  // 6. Verify the expired_at timestamp is in the future
  const expiredAtDate = new Date(newExpiredAt);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAtDate > now);
  // 7. Verify the refreshable_until timestamp allows continued session extension
  const refreshableUntilDate = new Date(newRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilDate > now,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntilDate >= expiredAtDate,
  );
  // 8. Verify admin account details remain consistent after refresh
  TestValidator.equals("admin id unchanged", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "admin email unchanged",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "admin grade unchanged",
    initialAuth.grade,
    refreshedAuth.grade,
  );
}
