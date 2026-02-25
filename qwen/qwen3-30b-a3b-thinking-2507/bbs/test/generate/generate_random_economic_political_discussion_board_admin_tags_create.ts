import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_discussion_board_tag } from "../prepare/prepare_random_economic_political_discussion_board_tag";

export async function generate_random_economic_political_discussion_board_admin_tags_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomicPoliticalDiscussionBoardTag.ICreate>
      | undefined;
  },
): Promise<IEconomicPoliticalDiscussionBoardTag> {
  const prepared: IEconomicPoliticalDiscussionBoardTag.ICreate =
    prepare_random_economic_political_discussion_board_tag(props.body);
  return await api.functional.economicPoliticalDiscussionBoard.admin.tags.create(
    connection,
    { body: prepared },
  );
}
