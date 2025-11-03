import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login using email address as the credential identifier.
 *
 * This test validates the email-based login flow for moderators as an
 * alternative to username-based authentication. The test creates a moderator
 * account first, then authenticates using the email field along with the
 * password to verify successful authentication with tokens and profile
 * information returned.
 *
 * Steps:
 *
 * 1. Create a moderator account via join endpoint
 * 2. Authenticate using email (not username) in the username_or_email field
 * 3. Verify successful authentication with complete profile and tokens
 */
export async function test_api_moderator_login_with_email(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";

  const joinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: email,
    password: password,
    href: "https://example.com/moderator/join",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });

  typia.assert(createdModerator);

  // Step 2: Authenticate using email address (not username)
  const loginBody = {
    username_or_email: email,
    password: password,
    href: "https://example.com/moderator/login",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardModerator.ILogin;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });

  // Step 3: Validate the authenticated moderator response
  typia.assert(authenticatedModerator);

  // Verify email matches
  TestValidator.equals(
    "authenticated moderator email matches",
    authenticatedModerator.email,
    email,
  );
}
