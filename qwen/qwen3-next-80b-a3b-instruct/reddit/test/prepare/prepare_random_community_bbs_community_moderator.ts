import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
export function prepare_random_community_bbs_community_moderator(
  input?: DeepPartial<ICommunityBbsCommunityModerator.ICreate> | undefined,
): ICommunityBbsCommunityModerator.ICreate {
  return {
    monitor_id:
      input?.monitor_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
