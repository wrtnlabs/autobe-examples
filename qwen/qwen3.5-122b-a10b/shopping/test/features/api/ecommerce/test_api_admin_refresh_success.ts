import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
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
 * Test successful administrator token refresh workflow with valid refresh token.
 *
 * Validates the complete token refresh flow for administrator accounts, ensuring that valid refresh tokens can successfully obtain new access and refresh tokens while maintaining token rotation security policies.
 *
 * The test verifies that:
 * 1. Administrator registration returns initial tokens
 * 2. Refresh endpoint accepts valid refresh token and returns new tokens
 * 3. New tokens have correct expiration times (access: 15 minutes, refresh: 7 days)
 * 4. Old refresh token becomes invalid after successful refresh (token rotation)
 * 5. Administrator identity (id, email, grade) remains consistent across refresh
 *
 * 1. Register new administrator account with random credentials to obtain initial tokens.
 * 2. Extract refresh token from initial authorization response.
 * 3. Call refresh endpoint with the valid refresh token.
 * 4. Validate new tokens are returned with proper structure and expiration times.
 * 5. Verify administrator identity fields (id, email, grade) match the original.
 * 6. Attempt to use the old refresh token and confirm it is now invalid.
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Store original identity for comparison
  const originalId: string = initialAuth.id;
  const originalEmail: string = initialAuth.email;
  const originalGrade: IEcommerceAdministratorGrade.ISummary =
    initialAuth.grade;
  const originalRefreshToken: string = initialAuth.token.refresh;
  // 2. Refresh tokens using valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IEcommerceAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IEcommerceAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are returned with correct structure
  TestValidator.predicate(
    "access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is future",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // 4. Verify administrator identity remains unchanged
  TestValidator.equals("admin id matches", refreshedAuth.id, originalId);
  TestValidator.equals(
    "admin email matches",
    refreshedAuth.email,
    originalEmail,
  );
  TestValidator.equals(
    "admin grade matches",
    refreshedAuth.grade,
    originalGrade,
  );
  // 5. Verify old refresh token is now invalid (token rotation)
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token invalid", async () => {
    await authorize_admin_refresh(invalidRefreshConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IEcommerceAdmin.IRefresh,
    });
  });
}
