import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_feed_view(
  input?: DeepPartial<IRedditPlatformFeedView.ICreate> | undefined,
): IRedditPlatformFeedView.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    feed_result_id:
      input?.feed_result_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const),
    community_id:
      input?.community_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ] as const),
    session_id:
      input?.session_id ?? typia.random<string & tags.Format<"uuid">>(),
    feed_type:
      input?.feed_type ??
      RandomGenerator.pick(["home", "popular", "community"] as const),
    user_agent:
      input?.user_agent ??
      RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 1 }),
      ] as const),
    ip_address:
      input?.ip_address ??
      RandomGenerator.pick([null, RandomGenerator.alphaNumeric(8)] as const),
    engagement_duration:
      input?.engagement_duration ??
      RandomGenerator.pick([
        null,
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<3600>
        >(),
      ] as const),
    items_viewed:
      input?.items_viewed ??
      RandomGenerator.pick([
        null,
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      ] as const),
  };
}
