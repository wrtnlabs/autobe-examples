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
 * Test administrator token refresh when admin grade has changed since token issuance.
 *
 * Validates the security requirement that grade changes invalidate all existing sessions and prevents using old tokens after privilege level changes. The test verifies that when an administrator's grade is modified (promoted or demoted), their existing refresh tokens become invalid.
 *
 * Due to the absence of grade management API endpoints (promote/demote admin) in the provided SDK, this test validates the standard refresh token flow. The grade change validation scenario cannot be fully tested without grade transition endpoints.
 *
 * 1. Register a new administrator account with random credentials.
 * 2. Obtain initial authentication tokens (access and refresh).
 * 3. Store the original refresh token before any grade change.
 * 4. [SCENARIO LIMITATION] Attempt to use the original refresh token after grade change would occur.
 * 5. Validate that refresh token rotation works correctly with valid tokens.
 *
 * Note: Full grade change invalidation testing requires grade management APIs (super admin promotion/demotion) which are not available in the current SDK.
 */
export async function test_api_admin_refresh_grade_changed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminJoined);
  // 2. Store the original refresh token
  const originalRefreshToken: string = adminJoined.token.refresh;
  // 3. Validate that the refresh token is valid and can be used
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  adminRefreshConnection.headers = {
    Authorization: adminJoined.token.access,
  };
  const refreshed: IEcommerceAdmin.IAuthorized = await authorize_admin_refresh(
    adminRefreshConnection,
    {
      body: {
        refresh: originalRefreshToken,
      } satisfies IEcommerceAdmin.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 4. Validate that new tokens were issued
  TestValidator.notEquals(
    "access token should be different after refresh",
    adminJoined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated after refresh",
    originalRefreshToken,
    refreshed.token.refresh,
  );
  // 5. Validate token expiration timestamps
  TestValidator.predicate(
    "access token should have future expiration",
    new Date(refreshed.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token should have future expiration",
    new Date(refreshed.token.refreshable_until) > new Date(),
  );
  // 6. [SCENARIO LIMITATION] Grade change validation cannot be tested
  // The following scenario requires grade management APIs that are not available:
  // - Super admin login
  // - Admin grade promotion/demotion endpoint
  // - Verification that old refresh token is rejected after grade change
  //
  // Without grade management endpoints, we cannot test:
  // await TestValidator.httpError(
  //   "refresh should fail after grade change",
  //   401,
  //   async () => {
  //     await authorize_admin_refresh(oldTokenConnection, {
  //       body: { refresh: originalRefreshToken }
  //     });
  //   }
  // );
}
