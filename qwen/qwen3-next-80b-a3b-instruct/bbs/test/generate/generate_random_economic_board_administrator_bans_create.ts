import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_board_ban } from "../prepare/prepare_random_economic_board_ban";

export async function generate_random_economic_board_administrator_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicBoardBan.ICreate> | undefined;
  },
): Promise<IEconomicBoardBan> {
  const prepared: IEconomicBoardBan.ICreate = prepare_random_economic_board_ban(
    props.body,
  );
  return await api.functional.economicBoard.administrator.bans.create(
    connection,
    {
      body: prepared,
    },
  );
}
