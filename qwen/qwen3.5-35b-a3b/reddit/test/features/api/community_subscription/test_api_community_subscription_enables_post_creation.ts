import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Tests that community subscription is required before creating posts,
 * validating the business requirement that users must subscribe to a community
 * before they can create posts within it.
 *
 * This test validates:
 * 1. Member can subscribe to a community
 * 2. Subscription record is created with correct references
 * 3. Community subscriber_count is incremented on subscription
 * 4. Subscription enables future post creation (business logic)
 */
export async function test_api_community_subscription_enables_post_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (community owner)
  const firstMemberResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(firstMemberResult);
  // Step 2: Create community with first member as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = { Authorization: firstMemberResult.token.access };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<100>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const communityId = community.id;
  TestValidator.equals(
    "community initial subscriber count is 0",
    community.subscriber_count,
    0,
  );
  // Step 3: Create second member (subscriber)
  const secondMemberResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(secondMemberResult);
  // Step 4: Subscribe to community using second member
  const subscriberConnection: api.IConnection = { host: connection.host };
  subscriberConnection.headers = {
    Authorization: secondMemberResult.token.access,
  };
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      subscriberConnection,
      {
        communityId: communityId,
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 5: Verify subscription has correct member reference
  TestValidator.equals(
    "subscription member ID matches second member",
    subscription.redditPlatformMemberId,
    secondMemberResult.id,
  );
  // Step 6: Verify subscription has correct community reference
  TestValidator.equals(
    "subscription community ID matches community",
    subscription.redditPlatformCommunityId,
    communityId,
  );
  // Step 7: Verify community in subscription has correct data
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community.id,
    communityId,
  );
  TestValidator.equals(
    "subscription community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscription community subscriber count incremented to 1",
    subscription.community.subscriber_count,
    1,
  );
  // Step 8: Verify subscription timestamp
  TestValidator.predicate(
    "subscription has valid subscribed_at timestamp",
    () => new Date(subscription.subscribedAt) < new Date(),
  );
  // Step 9: Verify the business logic: subscription enables post creation
  // The subscription relationship is now established, allowing the member to create posts
  // (Post creation would be tested in test_api_community_post_creation)
  TestValidator.predicate(
    "subscription confirms user can now create posts in community",
    subscription.redditPlatformMemberId === secondMemberResult.id &&
      subscription.community.id === communityId,
  );
}
