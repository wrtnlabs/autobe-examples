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
import { generate_random_econ_politic_board_admin_system_configs_maintenance_create } from "../../../generate/generate_random_econ_politic_board_admin_system_configs_maintenance_create";
import { prepare_random_econ_politic_board_system_config } from "../../../prepare/prepare_random_econ_politic_board_system_config";

export async function test_api_system_config_maintenance_scheduled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // No specific body required for join
    },
  });
  // Step 2: Create a maintenance configuration with valid scheduled dates
  const scheduledStart = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const scheduledEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const message = "Scheduled maintenance from 10:00 to 12:00";
  // Use JSON.stringify for the value as expected by the API
  const value = JSON.stringify({
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    message: message,
  });
  const maintenanceConfig =
    await api.functional.econPoliticBoard.admin.systemConfigs.maintenance.create(
      adminConnection,
      {
        body: {
          key: "maintenance_window",
          value: value,
        } satisfies IEconPoliticBoardSystemConfig.ICreate,
      },
    );
  typia.assert(maintenanceConfig);
  // Step 3: Verify the maintenance configuration has the correct values
  // Use ICreate type to access response properties
  const config = maintenanceConfig as IEconPoliticBoardSystemConfig.ICreate;
  TestValidator.equals(
    "maintenance configuration key matches",
    config.key,
    "maintenance_window",
  );
  TestValidator.equals("value matches expected", config.value, value);
}
