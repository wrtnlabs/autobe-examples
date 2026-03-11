import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_moderator_role(
  input?: DeepPartial<IRedditLikeModeratorRole.ICreate>,
): IRedditLikeModeratorRole.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? RandomGenerator.pick(["owner", "moderator"] as const),
  };
}
