import { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_econ_politic_board_section(
  input?: DeepPartial<IEconPoliticBoardSection.ICreate> | undefined,
): IEconPoliticBoardSection.ICreate {
  return {};
}
