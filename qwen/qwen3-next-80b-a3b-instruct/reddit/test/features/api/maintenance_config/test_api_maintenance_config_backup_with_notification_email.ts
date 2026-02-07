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

export async function test_api_maintenance_config_backup_with_notification_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Step 2: Create maintenance configuration with empty body (as per ICommunityMaintenanceConfig.ICreate empty schema)
  const config =
    await generate_random_community_admin_maintenance_configs_create(
      adminConnection,
      {
        body: {} satisfies ICommunityMaintenanceConfig.ICreate,
      },
    );
  typia.assert(config);
  // Step 3: No validations possible - ICommunityMaintenanceConfig.ICreate is empty
  // All fields referenced in scenario (task_type, schedule_cron, enabled, config_data, notification_email) do not exist in schema
  // The API accepts only empty body according to DTO definition
}
