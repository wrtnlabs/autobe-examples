import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_subscription } from "../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Generate a random community subscription via the API for E2E testing.
 *
 * Prepares random subscription data using the prepare function, then calls the subscription creation endpoint.
 * The authenticated member is identified from the connection's session token.
 *
 * @param connection - HTTP connection with authentication
 * @param props - Generation parameters
 * @param props.body - Optional partial subscription data to customize
 * @returns The created subscription record
 */
export async function generate_random_reddit_like_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunitySubscription.ICreate>;
  },
): Promise<IRedditLikeCommunitySubscription> {
  const prepared: IRedditLikeCommunitySubscription.ICreate =
    prepare_random_reddit_like_community_subscription(props.body);
  const result: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.subscriptions.create(connection, {
      body: prepared,
    });
  return result;
}
