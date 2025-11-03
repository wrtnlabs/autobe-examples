import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Validate updating a user's profile information with proper authentication.
 *
 * This test covers the user registration, login, authenticated profile update,
 * validation of update success, and enforcement of authorization rules.
 *
 * Steps:
 *
 * 1. Register a new user with realistic randomized email and password.
 * 2. Ensure the returned authorized user data includes valid JWT token.
 * 3. Perform a profile update (e.g., change password) using the authenticated
 *    connection.
 * 4. Validate that updated information is reflected in the response.
 * 5. Attempt to update the profile again with an unauthenticated connection.
 * 6. Expect unauthorized error to be thrown, ensuring protection of user data.
 */
export async function test_api_user_profile_update_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const newUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: newUserBody,
    });

  typia.assert(authorizedUser);

  // Step 2: Prepare authenticated connection with JWT token
  // The SDK updates connection.headers.Authorization internally

  // Step 3: Perform a profile update using authenticated connection
  // Modify the password property as an example
  const updateBody = {
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityUser.IUpdate;

  const updatedUser: IRedditCommunityUser =
    await api.functional.redditCommunity.user.users.update(connection, {
      userId: authorizedUser.id,
      body: updateBody,
    });
  typia.assert(updatedUser);

  TestValidator.equals(
    "updated user id should match original",
    updatedUser.user_id,
    authorizedUser.id,
  );

  // Step 4: Attempt update using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated update should throw error",
    async () => {
      await api.functional.redditCommunity.user.users.update(
        unauthenticatedConnection,
        {
          userId: authorizedUser.id,
          body: {
            password: RandomGenerator.alphaNumeric(16),
          } satisfies IRedditCommunityUser.IUpdate,
        },
      );
    },
  );
}
