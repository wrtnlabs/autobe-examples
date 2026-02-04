import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_econ_politic_board_system_config } from "../prepare/prepare_random_econ_politic_board_system_config";

export async function generate_random_econ_politic_board_admin_system_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconPoliticBoardSystemConfig.ICreate> | undefined;
  },
): Promise<IEconPoliticBoardSystemConfig> {
  const prepared = prepare_random_econ_politic_board_system_config(props.body);
  return await api.functional.econPoliticBoard.admin.systemConfigs.create(
    connection,
    {
      body: prepared,
    },
  );
}
