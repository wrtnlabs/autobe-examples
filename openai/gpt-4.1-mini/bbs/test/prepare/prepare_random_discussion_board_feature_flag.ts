import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_feature_flag(
  input?: DeepPartial<IDiscussionBoardFeatureFlag.ICreate>,
): IDiscussionBoardFeatureFlag.ICreate {
  return {
    code: input?.code ?? RandomGenerator.alphaNumeric(10),
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: RandomGenerator.pick([2, 3, 4]) }),
    enabled: input?.enabled ?? typia.random<boolean>(),
  };
}
