import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_bulk_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminInfo = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create sample configurations to update
  const configUpdates: IRedditPlatformSystematicConfig.IUpdate[] = [
    {
      config_value: "New Site Name",
      config_type: "string",
      description: "Updated site name configuration",
      is_active: true,
    },
    {
      config_value: "5000",
      config_type: "int",
      description: "Updated maximum post size",
      is_active: true,
    },
    {
      config_value: "true",
      config_type: "boolean",
      description: "Updated feature flag",
      is_active: true,
    },
  ];
  // 3. Call bulk update endpoint with admin connection
  const result =
    await api.functional.redditPlatform.admin.system_configs.bulk.updateBulk(
      adminConnection,
      {
        body: {
          value: configUpdates,
        } satisfies IRedditPlatformSystematicConfig.IUpdateBulk,
      },
    );
  // 4. Validate response structure and counts
  typia.assert(result);
  TestValidator.equals(
    "successCount equals total configs",
    result.successCount,
    configUpdates.length,
  );
  TestValidator.equals(
    "totalCount matches input array length",
    result.totalCount,
    configUpdates.length,
  );
  TestValidator.equals(
    "configs array length matches",
    result.configs.length,
    configUpdates.length,
  );
  // 5. Verify updated configurations have expected fields
  for (const config of result.configs) {
    TestValidator.equals(
      "config has string config_value",
      typeof config.config_value,
      "string",
    );
    TestValidator.equals(
      "config has string config_type",
      typeof config.config_type,
      "string",
    );
    TestValidator.equals(
      "config has boolean is_active",
      typeof config.is_active,
      "boolean",
    );
    TestValidator.predicate(
      "config has uuid id",
      /^[0-9a-f-]{36}$/i.test(config.id),
    );
  }
}
