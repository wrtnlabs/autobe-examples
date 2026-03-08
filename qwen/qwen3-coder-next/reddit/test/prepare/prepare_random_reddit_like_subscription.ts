import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_subscription(
  input?: DeepPartial<IRedditLikeSubscription.ICreate>,
): IRedditLikeSubscription.ICreate {
  return {
    reddit_like_member_id:
      input?.reddit_like_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reddit_like_community_id:
      input?.reddit_like_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ??
      RandomGenerator.pick(["subscribed", "unsubscribed"] as const),
  };
}
