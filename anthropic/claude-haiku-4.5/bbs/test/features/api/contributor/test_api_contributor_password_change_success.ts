import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test successful password change for an authenticated contributor.
 *
 * This test validates that a contributor can successfully change their password
 * by providing their current password and a new password meeting security
 * requirements. The test verifies that:
 *
 * 1. Password change completes successfully with proper validation
 * 2. Password_changed_at timestamp is updated
 * 3. All active sessions are invalidated for security
 * 4. Response contains success indicator, confirmation message, changed timestamp,
 *    and sessions_invalidated flag
 *
 * Test flow:
 *
 * 1. Register a new contributor account
 * 2. Verify authentication token is received
 * 3. Prepare a valid new password meeting security requirements
 * 4. Call password change API with current and new passwords
 * 5. Validate all response fields indicating successful password change
 */
export async function test_api_contributor_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const currentPassword = "SecurePass123!";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email,
        username,
        password: currentPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Verify contributor was created with active status
  TestValidator.equals("contributor email matches", contributor.email, email);
  TestValidator.equals(
    "contributor username matches",
    contributor.username,
    username,
  );
  TestValidator.equals(
    "contributor account is active",
    contributor.account_status,
    "active",
  );
  TestValidator.predicate(
    "contributor has valid access token",
    contributor.token.access.length > 0,
  );

  // Step 2: Prepare new password meeting security requirements
  // Must have: 8+ chars, uppercase, lowercase, number, special character
  const newPassword = "NewSecure456@";

  // Step 3: Call password change API
  const changeResult: IDiscussionBoardContributor.IPasswordChangeResult =
    await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          password_confirmation: newPassword,
        } satisfies IDiscussionBoardContributor.IChangePassword,
      },
    );
  typia.assert(changeResult);

  // Step 4: Validate response fields
  TestValidator.equals(
    "password change success indicator is true",
    changeResult.success,
    true,
  );

  TestValidator.predicate(
    "confirmation message is provided",
    changeResult.message.length > 0,
  );

  TestValidator.predicate(
    "changed_at timestamp is in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/i.test(changeResult.changed_at),
  );

  TestValidator.equals(
    "sessions invalidated flag is true",
    changeResult.sessions_invalidated,
    true,
  );

  // Step 5: Verify the timestamp is reasonable (recent)
  const changedAtDate = new Date(changeResult.changed_at);
  const now = new Date();
  const timeDifference = now.getTime() - changedAtDate.getTime();

  TestValidator.predicate(
    "changed_at timestamp is recent (within 1 minute)",
    timeDifference >= 0 && timeDifference < 60000,
  );
}
