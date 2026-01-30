import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
export function prepare_random_community_bbs_user_ban(
  input?: DeepPartial<ICommunityBbsUserBan.ICreate>,
): ICommunityBbsUserBan.ICreate {
  return {
    userId: input?.userId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    expiresAt:
      input?.expiresAt ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<string & tags.Format<"date-time">>()
        : null),
  };
}
