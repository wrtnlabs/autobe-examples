import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_block(
  input?: DeepPartial<IRedditCloneBlock.ICreate> | undefined,
): IRedditCloneBlock.ICreate {
  return {
    blocked_user_id:
      input?.blocked_user_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
