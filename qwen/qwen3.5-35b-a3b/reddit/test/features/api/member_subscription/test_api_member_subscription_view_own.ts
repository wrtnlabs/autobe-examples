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

export async function test_api_member_subscription_view_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create a community that the member will subscribe to
  const communityConnection: api.IConnection = { host: connection.host };
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription ID matches
  TestValidator.equals("subscription ID", subscription.id, subscription.id);
  // 5. Retrieve the subscription details
  const retrievedSubscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 6. Validate all fields are correct
  TestValidator.equals(
    "subscription ID",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member ID",
    retrievedSubscription.redditPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "community ID",
    retrievedSubscription.redditPlatformCommunityId,
    community.id,
  );
  TestValidator.equals(
    "deleted at (should be null)",
    retrievedSubscription.deletedAt,
    null,
  );
  // 7. Validate member details
  TestValidator.equals(
    "member username",
    retrievedSubscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "member displayName",
    retrievedSubscription.member.displayName,
    member.displayName,
  );
  // 8. Validate community details
  TestValidator.equals(
    "community name",
    retrievedSubscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community subscriber count",
    retrievedSubscription.community.subscriber_count,
    community.subscriber_count,
  );
  // 9. Validate timestamps exist and are valid date-time format
  TestValidator.notEquals(
    "subscribed at exists",
    retrievedSubscription.subscribedAt,
    null,
  );
  TestValidator.notEquals(
    "created at exists",
    retrievedSubscription.createdAt,
    null,
  );
  TestValidator.notEquals(
    "updated at exists",
    retrievedSubscription.updatedAt,
    null,
  );
}
