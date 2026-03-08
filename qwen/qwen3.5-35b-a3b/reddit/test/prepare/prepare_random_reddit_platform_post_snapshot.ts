import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post_snapshot(
  input?: DeepPartial<IRedditPlatformPostSnapshot.ICreate>,
): IRedditPlatformPostSnapshot.ICreate {
  const post_type =
    input?.post_type ??
    RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 5 }),
    post_type: post_type,
    url:
      input?.url ??
      (post_type === "LINK"
        ? (RandomGenerator.alphabets(80) as string & tags.MaxLength<80000>)
        : (null as (string & tags.MaxLength<80000>) | null | undefined)),
    image_url:
      input?.image_url ??
      (post_type === "IMAGE"
        ? (RandomGenerator.alphabets(80) as string & tags.MaxLength<80000>)
        : (null as (string & tags.MaxLength<80000>) | null | undefined)),
    vote_score:
      input?.vote_score ?? typia.random<number & tags.Type<"int32">>(),
    comment_count:
      input?.comment_count ?? typia.random<number & tags.Type<"int32">>(),
    snapshot_type:
      input?.snapshot_type ??
      RandomGenerator.pick(["CREATE", "EDIT", "DELETE"] as const),
  };
}
