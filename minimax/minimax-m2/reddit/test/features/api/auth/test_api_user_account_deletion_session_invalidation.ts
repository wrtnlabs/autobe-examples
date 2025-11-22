import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_account_deletion_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account for testing session invalidation
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.name(1);

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: testUsername,
        email: testEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Test account for session invalidation testing",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  TestValidator.equals(
    "new user created successfully",
    newUser.email,
    testEmail,
  );
  TestValidator.predicate("user is authenticated", !!newUser.token.access);

  // Step 2: Delete the user account which should invalidate the session
  await api.functional.redditPlatform.registeredUser.auth.profile.erase(
    connection,
  );

  // Step 3: Verify session is invalidated by attempting another authenticated API call
  // This should fail with authentication error since the session was invalidated
  await TestValidator.error(
    "session should be invalid after account deletion",
    async () => {
      // Try to access user profile - this should fail with authentication error
      await api.functional.redditPlatform.registeredUser.auth.profile.erase(
        connection,
      );
    },
  );
}
