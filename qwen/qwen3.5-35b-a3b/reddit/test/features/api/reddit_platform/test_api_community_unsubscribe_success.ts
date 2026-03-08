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

export async function test_api_community_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create community as member
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<30>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          confirmSubscription: true,
        },
      },
    );
  typia.assert(subscription!);
  // Verify subscription created correctly
  TestValidator.equals(
    "subscription member_id matches memberAuth",
    subscription.redditPlatformMemberId,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community_id matches community",
    subscription.redditPlatformCommunityId,
    community.id,
  );
  // 4. Verify subscriber_count is 1 after subscribe
  TestValidator.equals(
    "subscriber_count is 1 after subscribe",
    subscription.community.subscriber_count,
    1,
  );
  // 5. Unsubscribe from community
  await api.functional.redditPlatform.member.communities.unsubscribe(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 6. Subscribe again to verify unsubscribe worked (subscriber_count should still be 1)
  const reSubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          confirmSubscription: true,
        },
      },
    );
  typia.assert(reSubscription!);
  // Verify subscriber_count is still 1 (unsubscribe decremented it to 0, re-subscribe incremented to 1)
  TestValidator.equals(
    "subscriber_count is 1 after re-subscribe (unsubscribe successfully decremented)",
    reSubscription.community.subscriber_count,
    1,
  );
  // Verify re-subscription record is active (not soft-deleted)
  TestValidator.equals(
    "re-subscription is active (not soft-deleted)",
    reSubscription.deletedAt,
    null,
  );
}
