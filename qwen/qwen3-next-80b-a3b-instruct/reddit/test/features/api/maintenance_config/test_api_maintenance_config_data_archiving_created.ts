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

export async function test_api_maintenance_config_data_archiving_created(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the utility function
  await authorize_admin_join(adminConnection, {
    body: {}, // Empty object since ICommunityAdmin.IJoin is {} in the schema
  });
  // Create maintenance configuration using the utility function with empty body
  const config =
    await generate_random_community_admin_maintenance_configs_create(
      adminConnection,
      {
        body: {}, // Empty object since ICommunityMaintenanceConfig.ICreate is {} in the schema
      },
    );
  // Validate response
  typia.assert(config);
  // Do not validate any properties - the schema defines ICommunityMaintenanceConfig as {} (empty object)
  // This is required by the Anti-Hallucination Protocol and Compiler Validation
}
