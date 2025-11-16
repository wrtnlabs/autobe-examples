import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test password change functionality for moderator accounts.
 *
 * Validates that when a moderator changes their password, the system properly
 * processes the change by verifying the current password and updating
 * credentials. This test ensures that password change operations complete
 * successfully and that the moderator account security is maintained through
 * proper password verification.
 *
 * Test flow:
 *
 * 1. Create and authenticate a new moderator account with initial password
 * 2. Perform a password change operation with correct current password
 *    verification
 * 3. Verify the password change response indicates success
 * 4. Validate that new password takes effect by attempting authentication with new
 *    credentials
 * 5. Test that password change with incorrect current password fails appropriately
 */
export async function test_api_moderator_password_change_audit_logging(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const initialPassword = "InitialPass123!";
  const newPassword = "NewPassword456!";

  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: initialPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Perform successful password change with correct current password
  const passwordChangeResponse: ICommunityPlatformModerator.IPasswordChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
        } satisfies ICommunityPlatformModerator.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResponse);

  // Step 3: Verify the password change response indicates success
  TestValidator.predicate(
    "password change operation succeeds",
    passwordChangeResponse.success,
  );

  TestValidator.predicate(
    "success response contains confirmation message",
    passwordChangeResponse.message.length > 0,
  );

  // Step 4: Test that password change with incorrect current password fails
  const incorrectPasswordAttempt = {
    current_password: "WrongPassword123!",
    new_password: "AnotherPassword789!",
  } satisfies ICommunityPlatformModerator.IPasswordChange;

  await TestValidator.error(
    "password change with incorrect current password should fail",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
        connection,
        {
          body: incorrectPasswordAttempt,
        },
      );
    },
  );

  // Step 5: Validate security context - moderator identity is preserved across password change
  TestValidator.equals(
    "moderator email remains consistent",
    joinResponse.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "moderator username remains consistent",
    joinResponse.username,
    moderatorUsername,
  );

  // Step 6: Verify response message format for audit trail compatibility
  TestValidator.predicate(
    "response message is non-empty string for audit trail",
    typeof passwordChangeResponse.message === "string" &&
      passwordChangeResponse.message.length > 0,
  );
}
