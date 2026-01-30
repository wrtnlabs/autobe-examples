import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
export function prepare_random_community_bbs_karma_score(
  input?: DeepPartial<ICommunityBbsKarmaScore.ICreate>,
): ICommunityBbsKarmaScore.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    karma_points:
      input?.karma_points ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-10> & tags.Maximum<50>
      >(),
  };
}
