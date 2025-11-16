import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when the request is not authenticated or lacks
 * proper authorization.
 *
 * An unauthenticated request (missing or invalid JWT token) attempts to change
 * an administrator's password. The operation should reject the request due to
 * missing or invalid authentication credentials. This test validates that the
 * password change endpoint properly enforces administrator authentication
 * requirements.
 *
 * Test flow:
 *
 * 1. Create an unauthenticated connection (no authorization header or invalid
 *    token)
 * 2. Attempt to call the password change endpoint without valid authentication
 * 3. Verify the operation fails with an authorization/authentication error
 * 4. Confirm the error is properly handled for security purposes
 */
export async function test_api_administrator_password_change_unauthorized(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing the authorization header
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Prepare password change request body
  const passwordChangeBody = {
    current_password: "currentPassword123",
    new_password: "newPassword456",
    new_password_confirm: "newPassword456",
  } satisfies ICommunityPlatformAdministrator.IPasswordChange;

  // Attempt to change password without authentication - should fail
  await TestValidator.error(
    "password change should fail without authentication",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        unauthConnection,
        {
          body: passwordChangeBody,
        },
      );
    },
  );
}
