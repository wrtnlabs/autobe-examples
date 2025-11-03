import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login using username as the credential identifier.
 *
 * This test validates the username-based authentication flow for moderators. It
 * creates a moderator account through registration, then authenticates using
 * the username (not email) along with the password to verify that the
 * alternative login method works correctly.
 *
 * Steps:
 *
 * 1. Create a new moderator account via join API
 * 2. Authenticate using username as the credential identifier
 * 3. Validate successful authentication with tokens and profile information
 */
export async function test_api_moderator_login_with_username(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to obtain username for login testing
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";

  const registrationData = {
    username: username,
    email: email,
    password: password,
    href: "https://discussion.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  typia.assert(createdModerator);

  TestValidator.equals(
    "created username matches",
    createdModerator.username,
    username,
  );
  TestValidator.equals("created email matches", createdModerator.email, email);

  // Step 2: Authenticate using username (not email) as the credential identifier
  const loginData = {
    username_or_email: username,
    password: password,
    href: "https://discussion.example.com/moderator/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ILogin;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });

  typia.assert(authenticatedModerator);

  // Step 3: Validate successful authentication with tokens and profile information
  TestValidator.equals(
    "authenticated username matches",
    authenticatedModerator.username,
    username,
  );
  TestValidator.equals(
    "authenticated email matches",
    authenticatedModerator.email,
    email,
  );
  TestValidator.equals(
    "authenticated moderator ID matches",
    authenticatedModerator.id,
    createdModerator.id,
  );

  // Validate authentication tokens are present
  TestValidator.predicate(
    "access token exists",
    authenticatedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authenticatedModerator.token.refresh.length > 0,
  );
}
