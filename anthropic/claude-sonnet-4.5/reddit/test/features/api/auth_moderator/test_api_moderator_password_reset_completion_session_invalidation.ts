import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test password reset request workflow for moderator accounts.
 *
 * This test validates the password reset request functionality for moderator
 * accounts, ensuring that the system properly handles password reset
 * initiation. The test creates a moderator account and verifies that password
 * reset requests can be successfully submitted with valid email addresses.
 *
 * Note: Complete end-to-end password reset testing (including token validation
 * and session invalidation) requires access to the reset token from email or
 * backend test hooks, which are not available through the current API
 * endpoints. This test focuses on the implementable portions of the password
 * reset workflow.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Verify successful account creation and authentication token issuance
 * 3. Request a password reset using the moderator's registered email
 * 4. Verify that the password reset request is acknowledged successfully
 */
export async function test_api_moderator_password_reset_completion_session_invalidation(
  connection: api.IConnection,
) {
  // 1. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: initialPassword,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Verify moderator account creation
  TestValidator.predicate(
    "moderator ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(moderator.id),
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator username exists",
    moderator.username.length >= 3,
  );
  TestValidator.predicate(
    "access token exists",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    moderator.token.refresh.length > 0,
  );

  // 3. Request password reset
  const resetRequest: IRedditLikeModerator.IPasswordResetResponse =
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IRedditLikeModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest);

  // 4. Verify password reset request successful
  TestValidator.equals(
    "reset request success flag is true",
    resetRequest.success,
    true,
  );
  TestValidator.predicate(
    "reset request message is provided",
    resetRequest.message.length > 0,
  );
}
