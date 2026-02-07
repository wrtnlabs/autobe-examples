import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_maintenance_configs_create } from "../../../generate/generate_random_community_admin_maintenance_configs_create";
import { prepare_random_community_maintenance_config } from "../../../prepare/prepare_random_community_maintenance_config";

export async function test_api_maintenance_config_cleanup_strict_failure_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create maintenance configuration with empty body - as defined in schema ICommunityMaintenanceConfig.ICreate = {}
  // Since the schema defines ICommunityMaintenanceConfig.ICreate as an empty object, we must pass {}.
  // The scenario's specific parameters (task_type, schedule_cron, etc.) are NOT defined in schema, so they cannot be used.
  // This test verifies that empty maintenance configs are accepted by the system.
  const maintenanceConfig =
    await api.functional.community.admin.maintenance_configs.create(
      adminConnection,
      {
        body: {} satisfies ICommunityMaintenanceConfig.ICreate,
      },
    );
  typia.assert(maintenanceConfig);
  // 3. Validate that the response is an ICommunityMaintenanceConfig - with only the expected properties (none of the scenario properties are defined in schema)
  // Since ICommunityMaintenanceConfig is also {} per schema, there are no properties to validate.
  // The creation process is validated by typia.assert on response.
  // Business logic of the scenario cannot be tested because the DTO schema contains no properties.
}
