import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_econ_politic_board_admin_system_configs_create } from "../../../generate/generate_random_econ_politic_board_admin_system_configs_create";
import { prepare_random_econ_politic_board_system_config } from "../../../prepare/prepare_random_econ_politic_board_system_config";

export async function test_api_system_config_create(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Create system config using utility function
  const config =
    await generate_random_econ_politic_board_admin_system_configs_create(
      adminConnection,
      { body: {} },
    );
  // Validate response types using typia
  typia.assert(config);
}
