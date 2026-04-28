import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test community subscription unsubscription success workflow.
 *
 * Validates the complete unsubscription flow where a member successfully unsubscribes from a community they have subscribed to. The member authenticates via join, creates a community, subscribes to it, and then performs the unsubscribe operation via DELETE endpoint.
 *
 * 1. Member authenticates via join to create account.
 * 2. Member creates a community and becomes the owner.
 * 3. Member subscribes to the community, obtaining a subscription record.
 * 4. Member calls DELETE endpoint with the subscriptionId to unsubscribe.
 * 5. The operation succeeds returning 204 No Content response.
 */
export async function test_api_community_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Member creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member subscribes to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Step 4: Member unsubscribes from the community via DELETE endpoint
  await api.functional.redditLikeCommunity.member.community_subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // Step 5: The operation succeeded without error confirming 204 No Content response
  TestValidator.predicate("unsubscribe operation succeeded", true);
}
