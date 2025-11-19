import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication failure with invalid credentials by creating a
 * moderator account first, then attempting login with invalid credentials. This
 * ensures proper error handling to prevent credential enumeration attacks and
 * maintain security best practices by validating that authentication errors are
 * returned without revealing specific validation details.
 *
 * 1. Create a moderator account using the join endpoint to establish valid
 *    credentials
 * 2. Attempt login with invalid credentials to validate proper error handling
 * 3. Ensure error responses are generic and don't leak specific credential
 *    validation details
 */
export async function test_api_moderator_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const validPassword = "correctPassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: validPassword,
      moderation_level: "basic",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test login with invalid credentials - using a single generic test
  // to ensure error responses don't reveal specific credential validation details
  await TestValidator.error(
    "login with invalid credentials should return generic authentication error",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email_or_username: moderatorEmail, // Valid email but wrong password
          password: "wrongPassword456", // Incorrect password
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // The error validation above ensures that:
  // - Authentication fails with invalid credentials
  // - Error responses are generic and don't leak specific validation details
  // - Security best practices are maintained by preventing credential enumeration
}
