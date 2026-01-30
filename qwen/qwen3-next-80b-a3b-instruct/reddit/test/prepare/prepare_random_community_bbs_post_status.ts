import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostStatus";
export function prepare_random_community_bbs_post_status(
  input?: DeepPartial<ICommunityBbsPostStatus.ICreate>,
): ICommunityBbsPostStatus.ICreate {
  return {
    color:
      input?.color ??
      RandomGenerator.pick([
        null,
        `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
      ] as const),
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }).trim(),
    code: input?.code ?? RandomGenerator.alphaNumeric(4).toUpperCase(),
  };
}
