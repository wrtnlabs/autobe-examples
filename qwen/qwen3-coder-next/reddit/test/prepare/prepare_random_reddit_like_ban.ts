import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_ban(
  input?: DeepPartial<IRedditLikeBan.ICreate> | undefined,
): IRedditLikeBan.ICreate {
  return {
    reddit_like_user_id:
      input?.reddit_like_user_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reddit_like_community_id:
      input?.reddit_like_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
    status:
      input?.status ?? RandomGenerator.pick(["active", "inactive"] as const),
  };
}
