import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can authenticate using their username instead of email
 * address.
 *
 * This test validates the flexibility of the moderator authentication system by
 * confirming that login can be performed using either email or username as the
 * identifier. This is a convenience feature for moderators who may prefer to
 * use their username for authentication.
 *
 * Steps:
 *
 * 1. Create a new moderator account with both username and email
 * 2. Store the username and password credentials
 * 3. Attempt login using the username (not email) with the password
 * 4. Verify successful authentication with valid JWT tokens
 * 5. Validate the returned authorization token structure
 */
export async function test_api_moderator_login_with_username_instead_of_email(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with both username and email
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        appointed_by_admin_id: adminId,
        username: username,
        email: email,
        password: password,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Attempt login using the username (not email) with the password
  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: {
      email: username, // Using username in the email field
      password: password,
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Verify successful authentication
  TestValidator.equals(
    "moderator ID matches",
    loginResult.id,
    createdModerator.id,
  );

  // Step 4: Validate authorization token structure
  typia.assert<IAuthorizationToken>(loginResult.token);
  TestValidator.predicate(
    "access token is present",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginResult.token.refresh.length > 0,
  );
}
