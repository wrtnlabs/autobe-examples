import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_discussion_board_tag(
  input?: DeepPartial<IEconomicPoliticalDiscussionBoardTag.ICreate> | undefined,
): IEconomicPoliticalDiscussionBoardTag.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
  };
}
