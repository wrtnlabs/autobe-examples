import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_feed_view(
  input?: DeepPartial<IRedditCloneFeedView.ICreate>,
): IRedditCloneFeedView.ICreate {
  return {
    feed_config_id:
      input?.feed_config_id ?? typia.random<string & tags.Format<"uuid">>(),
    cache_key: input?.cache_key ?? RandomGenerator.alphaNumeric(16),
    ttl_seconds:
      input?.ttl_seconds ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
