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
  // 1. Create admin account and get initial tokens (including refresh token)
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(initialAuth);
  // Validate initial auth response has required token properties
  TestValidator.equals(
    "initial access token exists",
    !!initialAuth.token.access,
    true,
  );
  TestValidator.equals(
    "initial refresh token exists",
    !!initialAuth.token.refresh,
    true,
  );
  TestValidator.equals(
    "initial expired_at exists",
    !!initialAuth.token.expired_at,
    true,
  );
  TestValidator.equals(
    "initial refreshable_until exists",
    !!initialAuth.token.refreshable_until,
    true,
  );
  // 2. Use the refresh token to obtain new tokens
  const newAuth = await authorize_admin_refresh(adminConnection, {
    body: {
      refreshToken: initialAuth.token.refresh,
    } satisfies IErpHrmAdmin.IRefresh,
  });
  typia.assert(newAuth);
  // 3. Validate the response contains valid JWT tokens (format: xxx.yyy.zzz)
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  TestValidator.predicate(
    "new access token is valid JWT format",
    jwtPattern.test(newAuth.token.access),
  );
  TestValidator.predicate(
    "new refresh token is valid JWT format",
    jwtPattern.test(newAuth.token.refresh),
  );
  // 4. Validate admin profile data is returned correctly
  TestValidator.equals("admin id matches", newAuth.id, initialAuth.id);
  TestValidator.equals("admin email matches", newAuth.email, initialAuth.email);
  TestValidator.equals(
    "admin display_name matches",
    newAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals("admin created_at exists", !!newAuth.created_at, true);
  TestValidator.equals("admin updated_at exists", !!newAuth.updated_at, true);
  // 5. Validate token expiration timestamps are valid ISO date-time format
  const accessExpiry = new Date(newAuth.token.expired_at);
  const refreshExpiry = new Date(newAuth.token.refreshable_until);
  TestValidator.predicate(
    "access token expiry is valid date",
    !isNaN(accessExpiry.getTime()),
  );
  TestValidator.predicate(
    "refresh token expiry is valid date",
    !isNaN(refreshExpiry.getTime()),
  );
  TestValidator.predicate(
    "access token not expired",
    accessExpiry.getTime() > Date.now(),
  );
  // 6. Validate new tokens are different from initial tokens (token rotation)
  TestValidator.notEquals(
    "new access token differs from initial",
    newAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from initial",
    newAuth.token.refresh,
    initialAuth.token.refresh,
  );
}
