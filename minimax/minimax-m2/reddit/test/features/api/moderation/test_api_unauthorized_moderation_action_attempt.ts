import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test authorization controls for moderation actions by attempting to create a
 * moderation action using a regular registered user without moderation
 * permissions.
 *
 * This test validates that proper access restrictions are enforced and
 * unauthorized users cannot create moderation actions. The test setup includes
 * creating both a regular registered user and a community moderator account,
 * then attempting to create a moderation action using the regular user's
 * credentials to verify the system properly rejects unauthorized access
 * attempts.
 */
export async function test_api_unauthorized_moderation_action_attempt(
  connection: api.IConnection,
) {
  // 1. Create a regular registered user without moderation permissions
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: registeredUserEmail,
        password: "testPassword123",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Login as the regular registered user
  const loggedInUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: registeredUserEmail,
        password: "testPassword123",
        href: "https://example.com/login",
        referrer: "https://example.com/register",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(loggedInUser);

  // 3. Attempt to create a moderation action using regular user credentials
  // This should fail with authorization error
  await TestValidator.error(
    "unauthorized user cannot create moderation actions",
    async () => {
      await api.functional.redditPlatform.communityModerator.moderationActions.create(
        connection,
        {
          body: {
            action_type: "user_warning",
            reason: "Test moderation action by unauthorized user",
            moderator_session_id: registeredUser.id,
            status: "active",
          } satisfies IRedditPlatformModerationAction.ICreate,
        },
      );
    },
  );

  // 4. Verify the system properly rejects the unauthorized request
  // The test above should have thrown an error, confirming access control is working
}
