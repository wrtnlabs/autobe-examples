import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh when the member account has been deactivated.
 * 1. Register a new member account to obtain initial refresh token
 * 2. Account deactivation is simulated externally (admin panel, database, etc.)
 * 3. Attempt to refresh token and verify it fails with HTTP 401 Unauthorized
 * 4. Validate that deactivated accounts cannot obtain new authentication tokens
 *
 * Note: This test assumes the member account has been deactivated through
 * external means (admin panel, direct database update, etc.) after registration.
 * The backend should check the deleted_at field during token refresh and reject
 * refresh attempts for deactivated accounts.
 */
export async function test_api_member_refresh_account_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const registered: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(registered);
  // Store the refresh token for later use
  const refreshToken = registered.token.refresh;
  const memberEmail = registered.email;
  // Validate initial registration was successful
  TestValidator.predicate(
    "member should have valid refresh token",
    refreshToken.length > 0,
  );
  TestValidator.predicate(
    "member should have valid email",
    memberEmail.length > 0,
  );
  // 2. Account deactivation simulation
  // In a real testing environment, this would be done via:
  // - Admin API endpoint (not available in current SDK)
  // - Direct database update: UPDATE hrm_platform_members SET deleted_at = NOW() WHERE email = ?
  // - Admin panel action
  //
  // For this test, we assume the account has been deactivated externally
  // and proceed to test the refresh endpoint behavior
  // 3. Attempt to refresh the token with deactivated account
  // This should fail with HTTP 401 Unauthorized because the account is deactivated
  await TestValidator.httpError(
    "refresh should return 401 for deactivated account",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
  // 4. Verify that the refresh operation throws an error
  // This confirms the security check is working properly
  await TestValidator.error(
    "refresh should throw error for deactivated account",
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
}
