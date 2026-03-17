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
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
