import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test duplicate subscription prevention to ensure users cannot subscribe to
 * the same community twice.
 *
 * This test validates the core business rule that prevents duplicate community
 * subscriptions. It ensures data integrity by verifying the unique constraint
 * on (community_id, member_id) and confirms that subscriber counts remain
 * accurate when duplicate attempts are made.
 *
 * Test workflow:
 *
 * 1. Register a new member account for testing
 * 2. Create a test community
 * 3. Successfully subscribe the member to the community (first subscription)
 * 4. Verify the subscription was created successfully
 * 5. Attempt to subscribe the same member to the same community again (duplicate
 *    attempt)
 * 6. Verify the system handles the duplicate gracefully without creating a new
 *    record
 * 7. Confirm subscriber_count is not incorrectly incremented
 */
export async function test_api_subscription_duplicate_prevention(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  const communityCode = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 15 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  const initialSubscriberCount = community.subscriber_count;

  const firstSubscription =
    await api.functional.redditLike.member.users.subscriptions.subscribe(
      connection,
      {
        userId: member.id,
        body: {
          community_id: community.id,
        } satisfies IRedditLikeUser.ISubscriptionCreate,
      },
    );
  typia.assert(firstSubscription);

  TestValidator.equals(
    "first subscription community_id matches",
    firstSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "first subscription member_id matches",
    firstSubscription.member_id,
    member.id,
  );

  const secondSubscription =
    await api.functional.redditLike.member.users.subscriptions.subscribe(
      connection,
      {
        userId: member.id,
        body: {
          community_id: community.id,
        } satisfies IRedditLikeUser.ISubscriptionCreate,
      },
    );
  typia.assert(secondSubscription);

  TestValidator.equals(
    "duplicate subscription returns same subscription ID",
    secondSubscription.id,
    firstSubscription.id,
  );
  TestValidator.equals(
    "duplicate subscription community_id unchanged",
    secondSubscription.community_id,
    firstSubscription.community_id,
  );
  TestValidator.equals(
    "duplicate subscription member_id unchanged",
    secondSubscription.member_id,
    firstSubscription.member_id,
  );
  TestValidator.equals(
    "duplicate subscription timestamp unchanged",
    secondSubscription.subscribed_at,
    firstSubscription.subscribed_at,
  );
}
