import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaPenalty";
export function prepare_random_community_bbs_karma_penalty(
  input?: DeepPartial<ICommunityBbsKarmaPenalty.ICreate>,
): ICommunityBbsKarmaPenalty.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    moderator_id:
      input?.moderator_id ?? typia.random<string & tags.Format<"uuid">>(),
    penalty_type:
      input?.penalty_type ??
      RandomGenerator.pick([
        "warning",
        "mute",
        "timeout",
        "ban",
        "permanent-ban",
      ] as const),
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 8,
      }),
  };
}
