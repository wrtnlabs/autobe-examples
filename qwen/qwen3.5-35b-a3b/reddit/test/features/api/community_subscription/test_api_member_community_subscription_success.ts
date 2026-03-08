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

export async function test_api_member_community_subscription_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Create community (member as owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription details
  TestValidator.equals(
    "member_id matches",
    subscription.redditPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "community_id matches",
    subscription.redditPlatformCommunityId,
    community.id,
  );
  // 5. Validate nested member object (ICreate - no id property)
  TestValidator.equals(
    "nested member username matches",
    subscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "nested member displayName matches",
    subscription.member.displayName,
    member.displayName,
  );
  // 6. Validate nested community object (ISummary - no subscriptions property)
  TestValidator.equals(
    "nested community_id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "nested community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "nested community subscriber_count is incremented",
    subscription.community.subscriber_count,
    community.subscriber_count + 1,
  );
  // 7. Validate subscribed_at timestamp
  const subscribedDate = new Date(subscription.subscribedAt);
  const now = new Date();
  const diffMs = now.getTime() - subscribedDate.getTime();
  const diffMins = diffMs / (1000 * 60);
  TestValidator.predicate(
    "subscribed_at is within 5 minutes",
    diffMins >= 0 && diffMins <= 5,
  );
  // 8. Validate createdAt and updatedAt timestamps are valid
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(new Date(subscription.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !isNaN(new Date(subscription.updatedAt).getTime()),
  );
  TestValidator.predicate(
    "deletedAt is null (active subscription)",
    subscription.deletedAt === null,
  );
}
