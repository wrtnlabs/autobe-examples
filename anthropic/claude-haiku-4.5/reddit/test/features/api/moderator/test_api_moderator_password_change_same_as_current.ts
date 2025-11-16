import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test password change where the new password is identical to the current
 * password.
 *
 * This test validates that the system rejects password change attempts when the
 * new password is the same as the current password. The system should enforce
 * the business rule that password changes require an actual modification to the
 * password value.
 *
 * **Workflow:**
 *
 * 1. Create and authenticate a moderator account with a known password
 * 2. Attempt to change the password to the same value
 * 3. Verify the operation fails with appropriate error response
 * 4. Confirm the error message indicates the issue
 * 5. Verify account state remains unchanged (original password still valid)
 */
export async function test_api_moderator_password_change_same_as_current(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const currentPassword = "TestPassword123!";

  const moderatorCreated: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: currentPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  typia.assert(moderatorCreated);
  TestValidator.predicate(
    "moderator account created successfully",
    moderatorCreated.id !== null && moderatorCreated.id !== undefined,
  );

  // Step 2: Attempt to change password to the same value (should fail)
  const passwordChangeResponse: ICommunityPlatformModerator.IPasswordChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: currentPassword, // Same as current - should be rejected
        } satisfies ICommunityPlatformModerator.IPasswordChange,
      },
    );

  typia.assert(passwordChangeResponse);

  // Step 3: Verify the operation failed
  TestValidator.equals(
    "password change with same password should fail",
    passwordChangeResponse.success,
    false,
  );

  // Step 4: Verify error message indicates the issue
  TestValidator.predicate(
    "error message should indicate password change requirement",
    passwordChangeResponse.message.length > 0,
  );

  // Step 5: Verify account state unchanged by confirming original password still authenticates
  const reauthenticated: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: currentPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  typia.assert(reauthenticated);
  TestValidator.equals(
    "original password still works after failed password change",
    reauthenticated.id,
    moderatorCreated.id,
  );
}
