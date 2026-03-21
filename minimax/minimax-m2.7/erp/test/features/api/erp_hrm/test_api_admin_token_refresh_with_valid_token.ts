import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account to obtain initial access and refresh tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens and expiration
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpireAt = initialAuth.token.expired_at;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IErpHrmAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate response contains new JWT access and refresh tokens
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 4. Verify updated expiration timestamps
  TestValidator.predicate(
    "new access token expiration is later than original",
    new Date(refreshedAuth.token.expired_at) > new Date(originalExpireAt),
  );
  TestValidator.predicate(
    "refreshable_until is a valid future date",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
}
