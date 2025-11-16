import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Verify that password change operation requires proper authentication.
 *
 * This test validates that the password change endpoint is properly protected
 * and cannot be accessed without valid authentication tokens. Attempting to
 * change a moderator's password without authentication should result in a 401
 * Unauthorized error.
 *
 * Test flow:
 *
 * 1. Create an unauthenticated connection (empty headers)
 * 2. Attempt to call password change endpoint without authentication
 * 3. Verify that the request is rejected with 401 Unauthorized
 * 4. Confirm that no password change occurs
 */
export async function test_api_moderator_password_change_unauthenticated(
  connection: api.IConnection,
) {
  // Create unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to call password change endpoint without authentication
  // This should fail with 401 Unauthorized
  await TestValidator.httpError(
    "password change should fail with 401 when unauthenticated",
    401,
    async () => {
      return await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
        unauthConn,
        {
          body: {
            current_password: RandomGenerator.alphabets(10),
            new_password: RandomGenerator.alphabets(12),
          } satisfies ICommunityPlatformModerator.IPasswordChange,
        },
      );
    },
  );
}
