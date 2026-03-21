import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_post_link(
  input?: DeepPartial<IRedditClonePostLink.ICreate>,
): IRedditClonePostLink.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    communityName: input?.communityName ?? RandomGenerator.name(1),
    type:
      input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const),
  };
}
