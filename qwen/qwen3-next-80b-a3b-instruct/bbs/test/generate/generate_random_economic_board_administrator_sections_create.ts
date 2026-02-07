import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_board_section } from "../prepare/prepare_random_economic_board_section";

export async function generate_random_economic_board_administrator_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicBoardSection.ICreate> | undefined;
  },
): Promise<IEconomicBoardSection> {
  const prepared: IEconomicBoardSection.ICreate =
    prepare_random_economic_board_section(props.body);
  return await api.functional.economicBoard.administrator.sections.create(
    connection,
    {
      body: prepared,
    },
  );
}
