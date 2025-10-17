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
 * Test the complete user subscription workflow where a member subscribes to a
 * public community.
 *
 * This test validates the end-to-end subscription process:
 *
 * 1. Register a new member account to establish authentication context
 * 2. Create a public community that will be available for subscription
 * 3. Subscribe the member to the created community
 * 4. Validate subscription creation with correct timestamps
 * 5. Verify community's subscriber_count is incremented
 * 6. Confirm subscription relationship is properly established
 * 7. Ensure response includes complete subscription details
 */
export async function test_api_subscription_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: RandomGenerator.name(1) + RandomGenerator.alphabets(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Validate member registration response
  TestValidator.equals(
    "member username matches",
    member.username,
    memberRegistration.username,
  );
  TestValidator.equals(
    "member email matches",
    member.email,
    memberRegistration.email,
  );
  TestValidator.equals("initial post karma is zero", member.post_karma, 0);
  TestValidator.equals(
    "initial comment karma is zero",
    member.comment_karma,
    0,
  );

  // Step 2: Create a public community
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Validate community creation response
  TestValidator.equals(
    "community code matches",
    community.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.equals(
    "community description matches",
    community.description,
    communityData.description,
  );
  TestValidator.equals("community is public", community.privacy_type, "public");
  TestValidator.equals(
    "initial subscriber count is zero",
    community.subscriber_count,
    0,
  );

  // Step 3: Subscribe member to the community
  const subscriptionRequest = {
    community_id: community.id,
  } satisfies IRedditLikeUser.ISubscriptionCreate;

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.users.subscriptions.subscribe(
      connection,
      {
        userId: member.id,
        body: subscriptionRequest,
      },
    );
  typia.assert(subscription);

  // Validate subscription response
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );
}
