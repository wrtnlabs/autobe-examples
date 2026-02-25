import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_discussion_board_section } from "../prepare/prepare_random_economic_political_discussion_board_section";

export async function generate_random_economic_political_discussion_board_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomicPoliticalDiscussionBoardSection.ICreate>
      | undefined;
  },
): Promise<IEconomicPoliticalDiscussionBoardSection> {
  const prepared: IEconomicPoliticalDiscussionBoardSection.ICreate =
    prepare_random_economic_political_discussion_board_section(props.body);
  return await api.functional.economicPoliticalDiscussionBoard.admin.sections.create(
    connection,
    { body: prepared },
  );
}
