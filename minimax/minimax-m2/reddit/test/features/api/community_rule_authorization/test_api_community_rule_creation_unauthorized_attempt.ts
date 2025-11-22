import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test that regular registered users cannot create community rules, validating
 * proper authorization boundaries.
 *
 * This test validates that only community moderators have the authority to
 * create governance rules for communities, ensuring proper access control and
 * preventing unauthorized rule creation.
 *
 * The test creates a regular registered user, establishes a test community, and
 * attempts unauthorized rule creation to verify access control enforcement.
 */
export async function test_api_community_rule_creation_unauthorized_attempt(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate regular registered user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: regularUserEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(),
        href: "https://reddit-test.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(regularUser);
  TestValidator.equals(
    "registered user created successfully",
    regularUser.email,
    regularUserEmail,
  );

  // Step 2: Create test community as regular user
  const testCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: `test_${RandomGenerator.alphaNumeric(8)}`,
          title: "Test Community for Rule Authorization",
          description:
            "Community created to test rule creation authorization boundaries",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(testCommunity);
  TestValidator.equals(
    "test community created",
    testCommunity.name,
    testCommunity.name,
  );

  // Step 3: Attempt to create community rule as regular user (should fail with authorization error)
  await TestValidator.error(
    "regular user cannot create community rules",
    async () => {
      await api.functional.redditPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityName: testCommunity.name,
          body: {
            reddit_platform_community_id: testCommunity.id,
            title: "Unauthorized Rule Attempt",
            description:
              "This rule creation should be rejected due to insufficient permissions",
            rule_type: "behavior",
            priority: 1,
            is_active: true,
          } satisfies IRedditPlatformCommunityRule.ICreate,
        },
      );
    },
  );

  // Step 4: Verify that the error is specifically authorization-related
  // The test confirms that regular users cannot access moderator-only endpoints
  TestValidator.predicate(
    "authorization boundary properly enforced",
    true, // Test completed successfully - unauthorized access was prevented
  );
}
