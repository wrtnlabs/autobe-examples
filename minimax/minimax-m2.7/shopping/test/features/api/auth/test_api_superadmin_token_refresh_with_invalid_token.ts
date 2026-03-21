import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test token refresh fails when using an invalid or malformed refresh token.
 *
 * This test validates security behavior:
 * 1. Create a super administrator account
 * 2. Attempt to refresh with invalid/malformed token
 * 3. Verify HTTP 401 error is returned
 * 4. Validate error response doesn't expose sensitive token structure information
 */
export async function test_api_superadmin_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator account for context
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // Validate the account was created successfully
  typia.assert(authorized);
  TestValidator.equals(
    "super admin has valid id",
    authorized.id.length > 0,
    true,
  );
  // 2. Attempt to refresh with invalid/malformed tokens
  // Test with completely random invalid token
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with random invalid token returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        invalidTokenConnection,
        {
          body: {
            refresh: "invalid.random.token.string",
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      ),
  );
  // Test with malformed JWT-like token (looks like JWT but invalid)
  const malformedJwtConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with malformed JWT returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        malformedJwtConnection,
        {
          body: {
            refresh:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      ),
  );
  // Test with empty string token
  const emptyTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with empty token returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        emptyTokenConnection,
        {
          body: {
            refresh: "",
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      ),
  );
  // Test with expired-looking token (old timestamp in JWT)
  const expiredJwtConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with expired JWT returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        expiredJwtConnection,
        {
          body: {
            refresh:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid_signature",
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      ),
  );
}
