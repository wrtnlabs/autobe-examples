import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that changing password invalidates all active sessions for the
 * contributor.
 *
 * Contributor registers and establishes a session. Contributor then changes
 * password. Verify that the session is invalidated after password change, the
 * previous session token cannot be reused, and the password change response
 * confirms session invalidation.
 *
 * Steps:
 *
 * 1. Register a new contributor account
 * 2. Store the authentication token as an active session
 * 3. Change password using the current session
 * 4. Verify password change response indicates sessions are invalidated
 * 5. Attempt to use the old session token for operations (should fail)
 * 6. Confirm sessions_invalidated flag is true
 */
export async function test_api_contributor_password_change_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const initialPassword = "SecurePass123!@#";

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email,
      username: username,
      password: initialPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Verify initial registration
  TestValidator.equals(
    "contributor registered with correct email",
    contributor.email,
    email,
  );
  TestValidator.equals(
    "contributor registered with correct username",
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

  // Step 2: Store the session token and create authenticated connection
  const sessionToken = contributor.token.access;
  const sessionConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${sessionToken}` },
  };

  // Step 3: Change password using the current authenticated session
  const newPassword = "NewSecurePass456!@#";

  const passwordChangeResult =
    await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
      sessionConnection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
          password_confirmation: newPassword,
        } satisfies IDiscussionBoardContributor.IChangePassword,
      },
    );
  typia.assert(passwordChangeResult);

  // Step 4: Verify password change response
  TestValidator.equals(
    "password change operation succeeded",
    passwordChangeResult.success,
    true,
  );
  TestValidator.equals(
    "sessions are invalidated",
    passwordChangeResult.sessions_invalidated,
    true,
  );
  TestValidator.predicate(
    "changed_at timestamp is valid ISO 8601",
    typeof passwordChangeResult.changed_at === "string",
  );
  TestValidator.predicate(
    "change confirmation message provided",
    passwordChangeResult.message.length > 0,
  );

  // Step 5: Verify old session token is invalidated and cannot be reused
  await TestValidator.error(
    "old session token should be invalid after password change",
    async () => {
      // Attempt to use invalidated session token for any authenticated operation
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        sessionConnection,
        {
          body: {
            current_password: newPassword,
            new_password: "AnotherPass789!@#",
            password_confirmation: "AnotherPass789!@#",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Step 6: Verify the changed_at timestamp is properly formatted
  const changedAtDate = new Date(passwordChangeResult.changed_at);
  TestValidator.predicate(
    "changed_at is valid and parseable datetime",
    !isNaN(changedAtDate.getTime()),
  );
}
