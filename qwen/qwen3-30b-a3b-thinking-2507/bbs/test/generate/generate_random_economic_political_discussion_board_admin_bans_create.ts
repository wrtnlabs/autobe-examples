import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_discussion_board_ban } from "../prepare/prepare_random_economic_political_discussion_board_ban";

export async function generate_random_economic_political_discussion_board_admin_bans_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomicPoliticalDiscussionBoardBan.ICreate>
      | undefined;
  },
): Promise<IEconomicPoliticalDiscussionBoardBan> {
  const prepared: IEconomicPoliticalDiscussionBoardBan.ICreate =
    prepare_random_economic_political_discussion_board_ban(props.body);
  return await api.functional.economicPoliticalDiscussionBoard.admin.bans.create(
    connection,
    {
      body: prepared,
    },
  );
}
