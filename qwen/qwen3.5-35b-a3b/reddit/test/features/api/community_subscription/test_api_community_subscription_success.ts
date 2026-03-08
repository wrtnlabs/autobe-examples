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

export async function test_api_community_subscription_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (community owner)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuthorized = await authorize_member_join(
    firstMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(firstMemberAuthorized);
  // 2. Create community as first member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      firstMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Verify initial subscriber count is 1 (owner)
  TestValidator.equals(
    "initial subscriber count",
    community.subscriber_count,
    1,
  );
  const communityId = community.id;
  // 4. Create second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthorized = await authorize_member_join(
    secondMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name().replace(/\s+/g, "").toLowerCase(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(secondMemberAuthorized);
  // 5. Second member subscribes to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      secondMemberConnection,
      {
        communityId: communityId,
        body: {
          confirmSubscription: true,
        },
      },
    );
  typia.assert(subscription);
  // 6. Verify response contains all required fields
  TestValidator.predicate("subscription ID is UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subscription.id,
    ),
  );
  TestValidator.equals(
    "member ID matches second member",
    subscription.redditPlatformMemberId,
    secondMemberAuthorized.id,
  );
  TestValidator.equals(
    "community ID matches expected",
    subscription.redditPlatformCommunityId,
    communityId,
  );
  TestValidator.predicate(
    "subscribedAt is valid date-time",
    () => !isNaN(Date.parse(subscription.subscribedAt)),
  );
  // 7. Verify member and community references
  TestValidator.equals(
    "member username matches second member",
    subscription.member.username,
    secondMemberAuthorized.username,
  );
  TestValidator.equals(
    "member displayName matches",
    subscription.member.displayName,
    secondMemberAuthorized.displayName,
  );
  TestValidator.equals(
    "community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    subscription.community.description,
    community.description,
  );
  TestValidator.equals(
    "community subscriber_count incremented to 2",
    subscription.community.subscriber_count,
    2,
  );
  // 8. Verify subscription entity has all required relationship fields
  TestValidator.predicate(
    "member field is present",
    () => subscription.member !== undefined,
  );
  TestValidator.predicate(
    "community field is present",
    () => subscription.community !== undefined,
  );
  TestValidator.predicate(
    "subscribedAt timestamp is after epoch",
    () => new Date(subscription.subscribedAt).getTime() > 0,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid",
    () => !isNaN(Date.parse(subscription.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt timestamp is valid",
    () => !isNaN(Date.parse(subscription.updatedAt)),
  );
  TestValidator.equals(
    "deletedAt is null (active subscription)",
    subscription.deletedAt,
    null,
  );
}
