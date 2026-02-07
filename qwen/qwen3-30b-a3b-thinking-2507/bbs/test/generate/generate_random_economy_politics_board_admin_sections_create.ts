import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_section } from "../prepare/prepare_random_economy_politics_board_section";

export async function generate_random_economy_politics_board_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardSection.ICreate> | undefined;
  },
): Promise<IEconomyPoliticsBoardSection> {
  const prepared: IEconomyPoliticsBoardSection.ICreate =
    prepare_random_economy_politics_board_section(props.body);
  const result: IEconomyPoliticsBoardSection =
    await api.functional.economyPoliticsBoard.admin.sections.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
