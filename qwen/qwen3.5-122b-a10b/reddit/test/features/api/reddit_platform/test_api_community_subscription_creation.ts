import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_subscription_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community (member becomes owner and auto-subscribes)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify initial subscriber count is 1 (owner auto-subscribed)
  TestValidator.equals(
    "initial subscriber count",
    community.subscriberCount,
    1,
  );
  // 3. Create second member to subscribe to the community
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // Second member subscribes to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      secondMemberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription record structure
  TestValidator.equals(
    "subscription has valid UUID",
    subscription.id.length,
    36,
  );
  TestValidator.equals(
    "subscription member id matches",
    subscription.member.id,
    secondMemberAuth.id,
  );
  TestValidator.equals(
    "subscription community id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    subscription.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    subscription.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at is null for active subscription",
    subscription.deleted_at,
    null,
  );
  // 5. Verify community subscriber count incremented to 2 via subscription's community summary
  TestValidator.equals(
    "subscriber count incremented to 2",
    subscription.community.subscriber_count,
    2,
  );
}
