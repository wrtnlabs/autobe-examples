import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test the unsubscribe operation when the subscription ID provided does not
 * exist. Validates proper error handling and user feedback when attempting to
 * delete a non-existent subscription.
 *
 * This test follows the complete workflow:
 *
 * 1. Register a new member to establish authentication context
 * 2. Create a community to have a valid community context for testing
 * 3. Attempt to unsubscribe using a non-existent random subscription ID
 * 4. Verify that the operation properly handles the non-existent subscription case
 *
 * The scenario specifically tests the DELETE endpoint behavior when targeting a
 * subscription record that doesn't exist in the system, ensuring appropriate
 * error responses and handling mechanisms are in place.
 */
export async function test_api_member_community_unsubscribe_subscription_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to establish valid community context
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        category_name: "Discussion",
        type: "public",
        post_requirement_min_age: null,
        post_requirement_min_karma: null,
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Generate a random subscription ID that definitely doesn't exist
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Attempt to unsubscribe using the non-existent subscription ID
  // This should handle the not found case appropriately
  await TestValidator.error(
    "subscription not found should fail gracefully",
    async () => {
      return await api.functional.redditCommunity.member.communities.subscriptions.erase(
        connection,
        {
          communityName: community.name,
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );
}
