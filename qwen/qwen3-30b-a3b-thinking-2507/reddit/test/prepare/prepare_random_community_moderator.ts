import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_moderator(
  input?: DeepPartial<ICommunityModerator.ICreate> | undefined,
): ICommunityModerator.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    is_owner: input?.is_owner ?? RandomGenerator.pick([true, false] as const),
  };
}
