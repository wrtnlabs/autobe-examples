import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Test unsubscribing from an already-deleted subscription returns 400 error.
 *
 * Validates that attempting to unsubscribe from a subscription that has already been unsubscribed (soft-deleted) is rejected by the system. This test ensures the business rule preventing double-unsubscription is properly enforced.
 *
 * The test creates a valid subscription, successfully unsubscribes from it, then attempts to unsubscribe again to verify the system correctly rejects the operation with a 400 Bad Request error.
 *
 * 1. Register a new member account for testing.
 * 2. Create a community for the subscription target.
 * 3. Create a subscription to the community.
 * 4. Successfully unsubscribe from the subscription.
 * 5. Attempt to unsubscribe from the already-deleted subscription again.
 * 6. Verify the request is rejected with 400 Bad Request error.
 */
export async function test_api_subscription_unsubscribe_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create subscription
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Successfully unsubscribe from the subscription
  await api.functional.redditLike.member.subscriptions.erase(memberConnection, {
    subscriptionId: subscription.id,
  });
  // 5. Attempt to unsubscribe from the already-deleted subscription again
  // This should return 400 Bad Request error
  await TestValidator.httpError(
    "unsubscribe from already-deleted subscription should return 400",
    400,
    async () => {
      await api.functional.redditLike.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
