import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when member is not authenticated.
 *
 * This test validates that the password change endpoint properly enforces
 * authentication requirements. When an unauthenticated user attempts to change
 * their password without a valid JWT token, the API must reject the request
 * with HTTP 401 Unauthorized response.
 *
 * Test workflow:
 *
 * 1. Create an empty headers object to simulate unauthenticated connection
 * 2. Attempt to call password change endpoint without authentication token
 * 3. Verify that the operation fails with HTTP 401 Unauthorized
 * 4. Confirm no password change occurs due to missing authentication
 */
export async function test_api_member_password_change_unauthenticated(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by clearing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Attempt to change password without authentication token
  await TestValidator.httpError(
    "password change should reject unauthenticated request",
    401,
    async () => {
      return await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        unauthConnection,
        {
          body: {
            current_password: RandomGenerator.alphabets(8) + "Aa1!",
            new_password: RandomGenerator.alphabets(8) + "Bb2@",
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    },
  );
}
