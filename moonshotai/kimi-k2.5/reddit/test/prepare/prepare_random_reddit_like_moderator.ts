import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_moderator(
  input?: DeepPartial<IRedditLikeModerator.ICreate>,
): IRedditLikeModerator.ICreate {
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    canAddModerators: input?.canAddModerators,
  };
}
