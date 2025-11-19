import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: joinHref,
        referrer: joinReferrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Validate created moderator has expected properties
  TestValidator.equals(
    "moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    createdModerator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator account is active",
    createdModerator.is_active === true,
  );
  TestValidator.predicate(
    "moderator has token",
    createdModerator.token !== null && createdModerator.token !== undefined,
  );

  // Step 2: Login with session context to create a new session record
  const loginIpAddress = "203.0.113.42";
  const loginHref = "https://discussion-board.example.com/moderator/login";
  const loginReferrer =
    "https://discussion-board.example.com/moderator/dashboard";

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: loginIpAddress,
        href: loginHref,
        referrer: loginReferrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });

  typia.assert(loggedInModerator);

  // Step 3: Validate login response
  TestValidator.equals(
    "logged in moderator ID matches",
    loggedInModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "logged in moderator email matches",
    loggedInModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "logged in moderator username matches",
    loggedInModerator.username,
    moderatorUsername,
  );

  // Validate authentication token is provided
  TestValidator.predicate(
    "login returns access token",
    loggedInModerator.token.access !== null &&
      loggedInModerator.token.access !== undefined &&
      loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    loggedInModerator.token.refresh !== null &&
      loggedInModerator.token.refresh !== undefined &&
      loggedInModerator.token.refresh.length > 0,
  );

  // Validate token expiration timestamps
  TestValidator.predicate(
    "access token has expiration",
    loggedInModerator.token.expired_at !== null &&
      loggedInModerator.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    loggedInModerator.token.refreshable_until !== null &&
      loggedInModerator.token.refreshable_until !== undefined,
  );

  // Step 4: Validate session tracking information
  // The session is created with the provided IP, href, and referrer
  // While we cannot directly query the session table in this test,
  // we can verify that the login succeeded with the session context
  TestValidator.predicate(
    "moderator account remains active after login",
    loggedInModerator.is_active === true,
  );

  // Validate last_login_at was updated (should be present after login)
  TestValidator.predicate(
    "last login timestamp is set",
    loggedInModerator.last_login_at !== null &&
      loggedInModerator.last_login_at !== undefined,
  );

  // Step 5: Verify the moderator profile is complete for audit purposes
  TestValidator.predicate(
    "moderator created timestamp exists",
    loggedInModerator.created_at !== null &&
      loggedInModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderator updated timestamp exists",
    loggedInModerator.updated_at !== null &&
      loggedInModerator.updated_at !== undefined,
  );
  TestValidator.predicate(
    "moderator is not deleted",
    loggedInModerator.deleted_at === null ||
      loggedInModerator.deleted_at === undefined,
  );
}
