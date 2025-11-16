import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunitySubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscriptions";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member attempting to retrieve details of a non-existent subscription.
 * Validates proper error handling when subscription ID doesn't exist or member
 * doesn't have permission to access it. Ensures that subscription details
 * remain private and are only accessible to the legitimate subscriber.
 *
 * @step 1 Create authenticated member for testing subscription retrieval
 * @step 2 Validate member authentication and token assignment
 * @step 3 Create community to provide context for subscription operations
 * @step 4 Test retrieval of non-existent subscription (proper 404/error handling)
 * @step 5 Validate error responses ensure secure subscription access controls
 */
export async function test_api_community_subscription_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Validate member authentication
  TestValidator.predicate("member has valid ID", typeof member.id === "string");
  TestValidator.predicate(
    "member email matches registration",
    member.email === memberEmail,
  );

  // Step 3: Create community for context
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_name: "Technology",
        type: "public",
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Test non-existent subscription retrieval
  const nonExistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-existent subscription should return error",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.getSubscription(
        connection,
        {
          communityName: community.name,
          subscriptionId: nonExistentSubscriptionId,
        },
      );
    },
  );

  // Step 5: Test subscription retrieval with valid community and random UUID
  const anotherSubscriptionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "subscription for different member should be inaccessible",
    async () => {
      await api.functional.redditCommunity.member.communities.subscriptions.getSubscription(
        connection,
        {
          communityName: community.name,
          subscriptionId: anotherSubscriptionId,
        },
      );
    },
  );
}
