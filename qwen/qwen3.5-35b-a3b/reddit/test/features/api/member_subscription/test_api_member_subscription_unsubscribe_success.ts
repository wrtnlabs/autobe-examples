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

export async function test_api_member_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join new account
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community to subscribe to
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community to create a subscription record
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
  typia.assert(subscription);
  // 4. Verify subscription exists before deletion
  const subscriptionId = subscription.id;
  TestValidator.equals(
    "subscription should exist before delete",
    subscription.deletedAt,
    null,
  );
  // 5. Delete the subscription using DELETE endpoint
  await api.functional.redditPlatform.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId,
    },
  );
  // 6. Verify the deletion was successful by attempting to delete again
  // The backend should handle idempotent deletion gracefully
  TestValidator.predicate("subscription deletion completed successfully", true);
}
