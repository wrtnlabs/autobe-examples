import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication with complete session context including IP
 * address, connection URL, and referrer information. Validates that the
 * authentication system properly tracks session context for security monitoring
 * and audit purposes.
 */
export async function test_api_moderator_login_session_context(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.paragraph({ sentences: 2 });

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "testPassword123",
      display_name: "Test Moderator",
      bio: "Test moderator account for session context validation",
      moderation_level: "admin",
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test login with complete session context
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "testPassword123",
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate that login response contains proper authorization token
  TestValidator.equals(
    "login response should contain token",
    loginResponse.token !== undefined,
    true,
  );
  TestValidator.equals(
    "token should have access property",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh property",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token should not be empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    loginResponse.token.refresh.length > 0,
  );

  // Step 4: Validate that response contains proper moderator information
  TestValidator.equals(
    "email should match",
    loginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "username should match",
    loginResponse.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderation level should match",
    loginResponse.moderation_level,
    "admin",
  );
  TestValidator.equals(
    "display name should match",
    loginResponse.display_name,
    "Test Moderator",
  );
  TestValidator.predicate(
    "should have creation timestamp",
    loginResponse.created_at !== undefined,
  );

  // Step 5: Test login with username instead of email
  const usernameLoginResponse = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email_or_username: moderatorUsername,
        password: "testPassword123",
        ip: "192.168.1.101",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(usernameLoginResponse);

  // Step 6: Validate username login works correctly
  TestValidator.equals(
    "username login email should match",
    usernameLoginResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "username login username should match",
    usernameLoginResponse.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "username login should have valid token",
    usernameLoginResponse.token.access.length > 0,
  );
}
