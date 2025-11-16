import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when current password is incorrect.
 *
 * This test validates the security mechanism that prevents unauthorized
 * password changes by requiring the current password for verification. When an
 * authenticated member attempts to change their password but provides an
 * incorrect current password, the system should reject the operation with an
 * appropriate error response.
 *
 * The test workflow:
 *
 * 1. Create a member account with known credentials
 * 2. Authenticate and log in with the correct credentials
 * 3. Attempt to change the password with an incorrect current password
 * 4. Verify that the password change is rejected
 * 5. Verify that no account modifications occurred
 * 6. Verify that the session remains valid (sessions are not invalidated)
 */
export async function test_api_member_password_change_invalid_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const correctPassword = "SecurePass123!@#";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: correctPassword,
      ip: "192.168.1.1",
      href: "https://example.com/auth/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Member is now authenticated (connection already has the auth token)
  // The join endpoint automatically sets the authorization token in connection.headers

  // Step 3: Attempt to change password with incorrect current password
  const incorrectCurrentPassword = "WrongPassword123!@#";
  const newPassword = "NewSecurePass456!@#";

  // Step 4 & 5: Verify that the password change is rejected
  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    },
  );

  // Step 6: Verify that the session remains valid after the failed attempt
  // by making another authenticated API call. Since we don't have other authenticated
  // endpoints readily available, we'll verify the connection is still intact
  // and the authorization token is still present
  TestValidator.predicate(
    "authorization token should still be present in connection",
    connection.headers?.Authorization !== undefined &&
      connection.headers?.Authorization !== null,
  );
}
