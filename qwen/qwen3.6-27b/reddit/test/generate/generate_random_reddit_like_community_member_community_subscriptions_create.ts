import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_community_subscription } from "../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Generate a random Reddit-like community subscription for E2E testing.
 *
 * Prepares random subscription data using the prepare function to create a valid
 * IRedditLikeCommunityCommunitySubscription.ICreate with a random community UUID.
 * Then calls the creation endpoint to establish a subscription linking the
 * authenticated member to the specified community. The member identity
 * is automatically derived from the authentication session context.
 *
 * Upon successful creation, the returned subscription includes the join timestamp,
 * active status, and full entity data. The subscription grants the member
 * posting privileges within the subscribed community.
 */
export async function generate_random_reddit_like_community_member_community_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>;
  },
): Promise<IRedditLikeCommunityCommunitySubscription> {
  const prepared: IRedditLikeCommunityCommunitySubscription.ICreate =
    prepare_random_reddit_like_community_community_subscription(props.body);
  const result: IRedditLikeCommunityCommunitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      connection,
      { body: prepared },
    );
  return result;
}