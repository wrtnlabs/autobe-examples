import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving a user's subscribed communities list when subscriptions are
 * public.
 *
 * This test validates the complete workflow of viewing a user's public
 * subscription list:
 *
 * 1. Create a member account (the profile owner)
 * 2. Create a community to subscribe to
 * 3. Subscribe the member to the community
 * 4. Retrieve the user's subscription list
 * 5. Verify the subscription list contains the subscribed community with accurate
 *    metadata
 */
export async function test_api_user_subscriptions_public_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Subscribe the member to the community
  const subscriptionData = {
    community_id: community.id,
  } satisfies IRedditLikeUser.ISubscriptionCreate;

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: member.id,
      body: subscriptionData,
    });
  typia.assert(subscription);

  // Step 4: Retrieve the user's subscription list
  const subscriptionList: IPageIRedditLikeCommunitySubscription.ISummary =
    await api.functional.redditLike.users.subscriptions.getByUserid(
      connection,
      { userId: member.id },
    );
  typia.assert(subscriptionList);

  // Step 5: Verify the subscription list contains the subscribed community
  TestValidator.predicate(
    "subscription list should not be empty",
    subscriptionList.data.length > 0,
  );

  const foundSubscription = subscriptionList.data.find(
    (sub) => sub.community.id === community.id,
  );
  typia.assertGuard(foundSubscription!);

  TestValidator.equals(
    "subscribed community ID matches",
    foundSubscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "subscribed community name matches",
    foundSubscription.community.name,
    community.name,
  );

  TestValidator.equals(
    "subscribed community code matches",
    foundSubscription.community.code,
    community.code,
  );
}
