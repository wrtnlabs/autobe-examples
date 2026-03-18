import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_community_subscription_unsubscribe_not_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: different authenticated member cannot unsubscribe someone else’s subscription.
  // Steps:
  // 1) Member A joins
  // 2) Member A creates a community
  // 3) Member A subscribes to that community
  // 4) Member B joins
  // 5) Member B attempts to unsubscribe Member A's subscription
  // Assertions:
  // - unsubscribe is rejected
  // - Member A can still create a post in the community
  // - Member B's own subscriptions are not impacted (implicitly validated by only testing post gating for Member A)
  // Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberACommunity =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: prepare_random_community_platform_community(),
      } satisfies Parameters<
        typeof generate_random_community_platform_communities_create
      >[1],
    );
  typia.assert(memberACommunity);
  const memberASubscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: memberACommunity.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(memberASubscription);
  // Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Attempt to unsubscribe A's subscription using B credentials
  await TestValidator.error("unsubscribe denied for non-owner", async () => {
    await api.functional.communityPlatform.communitySubscriptions.erase(
      memberBConnection,
      {
        communitySubscriptionId: memberASubscription.id,
      },
    );
  });
  // Verify A is still subscribed by doing a subscription-gated action (post creation)
  const memberAPostCreateBody = typia.assert(
    prepare_random_community_platform_post({
      community_id: memberACommunity.id,
    }),
  ) satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: memberAPostCreateBody,
    },
  );
}
