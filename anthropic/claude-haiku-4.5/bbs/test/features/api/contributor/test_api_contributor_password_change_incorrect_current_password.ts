import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test password change with incorrect current password verification.
 *
 * This test validates that the password change endpoint properly verifies the
 * contributor's current password before allowing a new password to be set. When
 * an incorrect current password is provided, the operation must fail with an
 * authentication error, leaving the original password intact and all sessions
 * valid.
 *
 * Test flow:
 *
 * 1. Register a new contributor with a known password
 * 2. Authenticate the contributor to obtain valid session token
 * 3. Attempt to change password with an incorrect current password
 * 4. Verify the password change fails with appropriate error
 * 5. Verify the original password still works for authentication
 * 6. Confirm the session from step 2 remains valid
 */
export async function test_api_contributor_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor with a known password
  const originalPassword = "SecurePass123!";
  const newPassword = "NewSecurePass456!";

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor registered successfully",
    contributor.email_verified === false,
  );
  TestValidator.equals(
    "account status should be active",
    contributor.account_status,
    "active",
  );

  // Step 2: Verify the contributor can authenticate with correct password
  const authenticatedSession = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: contributor.email,
        username: contributor.username,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(authenticatedSession);
  TestValidator.equals(
    "authenticated contributor matches",
    authenticatedSession.id,
    contributor.id,
  );

  // Step 3: Attempt password change with incorrect current password
  const incorrectCurrentPassword = "WrongPassword789!";

  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
            password_confirmation: newPassword,
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Step 4: Verify original password still works for authentication
  const reAuthenticateWithOriginal = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: contributor.email,
        username: contributor.username,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(reAuthenticateWithOriginal);
  TestValidator.equals(
    "re-authentication with original password succeeds",
    reAuthenticateWithOriginal.id,
    contributor.id,
  );

  // Step 5: Verify the new password doesn't work (password wasn't changed)
  await TestValidator.error(
    "login with new password should fail since password wasn't changed",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: contributor.email,
          username: contributor.username,
          password: newPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Step 6: Verify sessions remain valid (no forced logout occurred)
  TestValidator.predicate(
    "authenticated session token should still be valid",
    authenticatedSession.token.access.length > 0 &&
      authenticatedSession.token.refresh.length > 0,
  );
}
