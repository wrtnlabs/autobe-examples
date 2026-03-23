import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_community(
  input?: DeepPartial<IRedditLikeCommunity.ICreate>,
): IRedditLikeCommunity.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
    icon_url:
      input?.icon_url ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
  };
}
