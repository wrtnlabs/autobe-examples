import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_econ_politic_board_section } from "../prepare/prepare_random_econ_politic_board_section";

export async function generate_random_econ_politic_board_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconPoliticBoardSection.ICreate>;
  },
): Promise<IEconPoliticBoardSection> {
  const prepared: IEconPoliticBoardSection.ICreate =
    prepare_random_econ_politic_board_section(props.body);
  return await api.functional.econPoliticBoard.admin.sections.create(
    connection,
    {
      body: prepared,
    },
  );
}
