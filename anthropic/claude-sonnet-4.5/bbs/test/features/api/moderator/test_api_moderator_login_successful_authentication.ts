import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator authentication with valid credentials.
 *
 * This test validates the complete moderator authentication workflow:
 *
 * 1. Create a new moderator account via join operation
 * 2. Authenticate using the registered email and password
 * 3. Verify response contains complete moderator profile (id, email, username,
 *    display_name, email_verified status, is_active flag, timestamps)
 * 4. Validate JWT tokens (access token, refresh token with proper expiration
 *    times)
 * 5. Confirm access token expires after 30 minutes and refresh token after 7 days
 * 6. Verify session context (ip, href, referrer) is properly captured
 * 7. Ensure last_login_at timestamp is updated after successful login
 */
export async function test_api_moderator_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Generate test moderator credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureTestPassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create moderator account via join
  const joinBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const joinedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedModerator);

  // Step 3: Validate join response business logic
  TestValidator.equals(
    "joined moderator email matches",
    joinedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "joined moderator username matches",
    joinedModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "joined moderator is active",
    joinedModerator.is_active,
    true,
  );

  // Step 4: Authenticate using login endpoint
  const loginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    href: testHref,
    referrer: testReferrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInModerator);

  // Step 5: Validate login response business logic
  TestValidator.equals(
    "logged in moderator ID matches joined moderator",
    loggedInModerator.id,
    joinedModerator.id,
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
  TestValidator.equals(
    "logged in moderator is active",
    loggedInModerator.is_active,
    true,
  );

  // Step 6: Validate token expiration periods (business requirement)
  const currentTime = new Date();
  const accessExpiration = new Date(loggedInModerator.token.expired_at);
  const refreshExpiration = new Date(loggedInModerator.token.refreshable_until);

  const accessExpirationMinutes =
    (accessExpiration.getTime() - currentTime.getTime()) / (1000 * 60);
  const refreshExpirationDays =
    (refreshExpiration.getTime() - currentTime.getTime()) /
    (1000 * 60 * 60 * 24);

  TestValidator.predicate(
    "access token expires in approximately 30 minutes",
    accessExpirationMinutes >= 29 && accessExpirationMinutes <= 31,
  );
  TestValidator.predicate(
    "refresh token expires in approximately 7 days",
    refreshExpirationDays >= 6.9 && refreshExpirationDays <= 7.1,
  );

  // Step 7: Verify last_login_at is updated (business requirement)
  TestValidator.predicate(
    "last_login_at timestamp exists after login",
    loggedInModerator.last_login_at !== null &&
      loggedInModerator.last_login_at !== undefined,
  );
}
