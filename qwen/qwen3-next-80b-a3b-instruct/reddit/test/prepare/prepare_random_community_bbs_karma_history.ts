import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaHistory";
export function prepare_random_community_bbs_karma_history(
  input?: DeepPartial<ICommunityBbsKarmaHistory.ICreate> | undefined,
): ICommunityBbsKarmaHistory.ICreate {
  return {
    userId: input?.userId ?? typia.random<string & tags.Format<"uuid">>(),
    delta:
      input?.delta ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
