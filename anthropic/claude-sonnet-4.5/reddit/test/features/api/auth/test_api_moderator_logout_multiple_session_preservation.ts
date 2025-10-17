import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator logout functionality.
 *
 * Note: The original scenario requested testing multiple concurrent sessions,
 * but the API does not provide a login endpoint to create additional sessions.
 * Therefore, this test validates basic logout behavior instead.
 *
 * Test Flow:
 *
 * 1. Create a moderator account (which establishes the first session)
 * 2. Verify the moderator account is created successfully
 * 3. Logout from the session
 * 4. Verify logout is successful
 * 5. Attempt to use the logged-out session (should fail)
 */
export async function test_api_moderator_logout_multiple_session_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account credentials
  const credentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeModerator.ICreate;

  // Step 2: Create moderator account (establishes first session)
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: credentials,
    });
  typia.assert(moderator);

  // Step 3: Verify moderator account details
  TestValidator.equals(
    "username matches",
    moderator.username,
    credentials.username,
  );
  TestValidator.equals("email matches", moderator.email, credentials.email);
  TestValidator.predicate(
    "email not verified initially",
    moderator.email_verified === false,
  );
  TestValidator.predicate(
    "has access token",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    moderator.token.refresh.length > 0,
  );

  // Step 4: Logout from the session
  const logoutResult: IRedditLikeModerator.ILogoutConfirmation =
    await api.functional.auth.moderator.logout(connection);
  typia.assert(logoutResult);
  TestValidator.equals("logout successful", logoutResult.success, true);
  TestValidator.predicate(
    "logout message exists",
    logoutResult.message.length > 0,
  );

  // Step 5: Verify the session is invalidated (attempting to logout again should fail)
  await TestValidator.error(
    "logged out session cannot make authenticated requests",
    async () => {
      await api.functional.auth.moderator.logout(connection);
    },
  );
}
