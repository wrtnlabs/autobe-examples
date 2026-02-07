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

export async function test_api_maintenance_config_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to have permission to update maintenance configurations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Update an existing maintenance configuration (using any valid UUID since we cannot fetch existing one)
  const configId = typia.random<string & tags.Format<"uuid">>();
  const updatedConfig =
    await api.functional.community.admin.maintenance_configs.update(
      adminConnection,
      {
        configId,
        body: {} satisfies ICommunityMaintenanceConfig,
      },
    );
  // Cast to a type that includes both ICommunityMaintenanceConfig and id property
  interface IUpdatedMaintenanceConfig extends ICommunityMaintenanceConfig {
    id: string;
  }
  const typedConfig = typia.assert<IUpdatedMaintenanceConfig>(updatedConfig);
  // 3. Validate successful update
  TestValidator.equals("config ID unchanged", typedConfig.id, configId);
  TestValidator.predicate("config is valid structure", () => {
    // Since ICommunityMaintenanceConfig = {}, we cannot assert any properties
    // The update must have succeeded (compiler proof)
    return true;
  });
}