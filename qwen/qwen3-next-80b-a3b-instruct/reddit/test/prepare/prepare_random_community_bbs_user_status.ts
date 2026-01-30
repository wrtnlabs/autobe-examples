import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
export function prepare_random_community_bbs_user_status(
  input?: DeepPartial<ICommunityBbsUserStatus.ICreate>,
): ICommunityBbsUserStatus.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick(["online", "away", "dnd", "offline"] as const),
  };
}
