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
 * 1. Creates a moderator account using join operation
 * 2. Attempts login with the same credentials
 * 3. Verifies JWT tokens and moderator identity information
 * 4. Ensures proper token expiration times
 */
export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for login testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(2),
        password: moderatorPassword,
        display_name: RandomGenerator.name(3),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        moderation_level: "senior",
        ip: "192.168.1.1",
        href: "https://example.com/auth/moderator/join",
        referrer: "https://example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Attempt login with the created credentials
  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.1",
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Validate moderator identity information matches exactly
  TestValidator.equals(
    "email matches created account",
    loginResult.email,
    createdModerator.email,
  );
  TestValidator.equals(
    "username matches created account",
    loginResult.username,
    createdModerator.username,
  );
  TestValidator.equals(
    "moderation level matches",
    loginResult.moderation_level,
    createdModerator.moderation_level,
  );
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    createdModerator.display_name,
  );
  TestValidator.equals("bio matches", loginResult.bio, createdModerator.bio);
  TestValidator.equals(
    "ID matches created account",
    loginResult.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    loginResult.created_at,
    createdModerator.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    loginResult.updated_at,
    createdModerator.updated_at,
  );

  // Step 4: Validate token structure and expiration
  TestValidator.predicate(
    "access token is present and non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    loginResult.token.refresh.length > 0,
  );

  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );

  // Step 5: Verify authentication headers are properly set
  TestValidator.predicate(
    "Authorization header is set in connection",
    connection.headers?.Authorization !== undefined,
  );

  const authorizationHeader = connection.headers?.Authorization;
  if (authorizationHeader) {
    TestValidator.predicate(
      "Authorization header contains Bearer prefix",
      authorizationHeader.toString().startsWith("Bearer "),
    );
    TestValidator.predicate(
      "Authorization header contains actual access token",
      authorizationHeader.toString().length > "Bearer ".length,
    );
    TestValidator.equals(
      "Authorization header contains correct access token",
      authorizationHeader.toString().substring("Bearer ".length),
      loginResult.token.access,
    );
  }
}
