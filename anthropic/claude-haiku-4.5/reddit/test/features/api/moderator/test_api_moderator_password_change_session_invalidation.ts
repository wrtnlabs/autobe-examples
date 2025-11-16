import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that all active sessions are invalidated after successful password
 * change.
 *
 * This test validates the security mechanism that prevents unauthorized access
 * when a moderator changes their password. The scenario includes:
 *
 * 1. Create a moderator account with initial authentication and session token
 * 2. Store the initial session token for later verification
 * 3. Perform a password change operation with the current valid session
 * 4. Verify password change succeeds and returns success confirmation
 * 5. Confirm that using old session token after password change is rejected
 * 6. Verify that the moderator account remains active and consistent
 *
 * This ensures password changes invalidate all previous sessions for security,
 * forcing re-authentication on all devices to prevent session hijacking.
 */
export async function test_api_moderator_password_change_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with initial authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePassword123!";
  const newPassword = "NewSecurePassword456!";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: originalPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created successfully",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username set correctly",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "account status is active",
    moderator.account_status,
    "active",
  );

  // Step 2: Store the initial session token before password change
  const initialAccessToken = moderator.token.access;
  TestValidator.predicate(
    "initial session token exists",
    initialAccessToken.length > 0,
  );

  // Step 3: Perform password change with the active session
  // The connection already has Authorization header set from join operation
  const passwordChangeResponse: ICommunityPlatformModerator.IPasswordChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newPassword,
        } satisfies ICommunityPlatformModerator.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResponse);
  TestValidator.equals(
    "password change operation succeeds",
    passwordChangeResponse.success,
    true,
  );
  TestValidator.predicate(
    "success message is provided",
    passwordChangeResponse.message.length > 0,
  );

  // Step 4: Create a connection with the old session token to simulate an old device session
  const oldSessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${initialAccessToken}`,
    },
    simulate: connection.simulate,
  };

  // Step 5: Verify that old session tokens are invalidated
  // Attempting to use old session token after password change should fail
  await TestValidator.error(
    "old session token is invalidated and rejected after password change",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.password_change.changePassword(
        oldSessionConnection,
        {
          body: {
            current_password: newPassword,
            new_password: "AnotherPassword789!",
          } satisfies ICommunityPlatformModerator.IPasswordChange,
        },
      );
    },
  );

  // Step 6: Verify moderator account remains intact and consistent
  TestValidator.equals(
    "moderator email unchanged after password change",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username unchanged after password change",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator account status still active",
    moderator.account_status,
    "active",
  );

  // Step 7: Verify password change is confirmed and permanent
  TestValidator.predicate(
    "password change operation completed and all sessions invalidated",
    passwordChangeResponse.success === true,
  );
}
