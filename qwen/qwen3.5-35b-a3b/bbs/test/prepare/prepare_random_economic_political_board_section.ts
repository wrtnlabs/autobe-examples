import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_board_section(
  input?: DeepPartial<IEconomicPoliticalBoardSection.ICreate> | undefined,
): IEconomicPoliticalBoardSection.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphabets(10),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
