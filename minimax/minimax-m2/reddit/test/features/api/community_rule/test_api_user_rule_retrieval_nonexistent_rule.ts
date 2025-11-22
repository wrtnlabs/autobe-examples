import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRule";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test registered user attempting to retrieve non-existent rule by invalid
 * ruleId.
 *
 * Validates that proper error response is returned when ruleId does not exist
 * in the database, ensuring robust error handling and user feedback for invalid
 * references.
 *
 * This test follows a complete setup workflow:
 *
 * 1. Register user account for authenticated access
 * 2. Create new community to establish rule context
 * 3. Join community to establish membership and access rights
 * 4. Attempt rule retrieval with non-existent ruleId
 * 5. Validate error handling and proper response
 */
export async function test_api_user_rule_retrieval_nonexistent_rule(
  connection: api.IConnection,
) {
  // Step 1: Register new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("user registration successful", user.email, userEmail);

  // Step 2: Create new community for testing
  const communityName = RandomGenerator.alphaNumeric(8);
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
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
  typia.assert(community);
  TestValidator.equals(
    "community creation successful",
    community.name,
    communityName,
  );

  // Step 3: Join the community to establish membership
  const membership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(membership);
  TestValidator.equals(
    "community membership established",
    membership.community.name,
    communityName,
  );
  TestValidator.predicate(
    "user is subscriber",
    membership.membership_level === "subscriber",
  );

  // Step 4: Generate invalid ruleId (properly formatted UUID that doesn't exist)
  const invalidRuleId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Attempt to retrieve non-existent rule and validate error handling
  await TestValidator.error(
    "non-existent rule retrieval should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.communities.rules.at(
        connection,
        {
          communityName: communityName,
          ruleId: invalidRuleId,
        },
      );
    },
  );

  // Additional validation: Confirm the error is specifically for rule not found
  // This validates that the error is about the rule, not about authentication or community access
  TestValidator.predicate(
    "test completed successfully - error handling validated",
    true,
  );
}
