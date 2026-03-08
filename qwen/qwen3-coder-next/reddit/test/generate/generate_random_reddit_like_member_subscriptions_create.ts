import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_subscription } from "../prepare/prepare_random_reddit_like_subscription";

export async function generate_random_reddit_like_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeSubscription.ICreate> | undefined;
  },
): Promise<IRedditLikeSubscription> {
  const prepared: IRedditLikeSubscription.ICreate =
    prepare_random_reddit_like_subscription(props.body);
  return await api.functional.redditLike.member.subscriptions.create(
    connection,
    {
      body: prepared,
    },
  );
}
