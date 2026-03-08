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
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test authorization rules for community owners viewing member subscriptions.
 * Community owners should be able to view all subscriptions to their community.
 */
export async function test_api_member_subscription_community_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Create community owned by the first member
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create second member account (subscriber)
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuthorized = await authorize_member_join(
    subscriberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(subscriberAuthorized);
  // 4. Subscribe second member to community owned by first member
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_create(
      subscriberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Use owner's connection to retrieve the subscription record
  const retrievedSubscription =
    await api.functional.redditPlatform.member.subscriptions.at(
      ownerConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 6. Validate owner can view subscription details
  TestValidator.equals(
    "subscription id matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member id matches subscriber",
    retrievedSubscription.redditPlatformMemberId,
    subscriberAuthorized.id,
  );
  TestValidator.equals(
    "community id matches original",
    retrievedSubscription.redditPlatformCommunityId,
    community.id,
  );
  TestValidator.equals(
    "subscriber member username matches",
    retrievedSubscription.member.username,
    subscriberAuthorized.username,
  );
  TestValidator.equals(
    "subscriber display name matches",
    retrievedSubscription.member.displayName,
    subscriberAuthorized.displayName,
  );
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    community.name,
  );
}
