import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_board_section } from "../prepare/prepare_random_economic_political_board_section";

export async function generate_random_economic_political_board_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicPoliticalBoardSection.ICreate> | undefined;
  },
): Promise<IEconomicPoliticalBoardSection> {
  const prepared: IEconomicPoliticalBoardSection.ICreate =
    prepare_random_economic_political_board_section(props.body);
  const result: IEconomicPoliticalBoardSection =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      connection,
      { body: prepared },
    );
  return result;
}
