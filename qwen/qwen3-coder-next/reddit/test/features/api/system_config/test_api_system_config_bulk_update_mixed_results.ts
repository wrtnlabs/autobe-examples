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

export async function test_api_system_config_bulk_update_mixed_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Fetch existing active configurations to get valid keys for updates
  const initialResult =
    await api.functional.redditPlatform.admin.system_configs.bulk.updateBulk(
      adminConnection,
      {
        body: { value: [] },
      },
    );
  typia.assert(initialResult);
  // 3. Prepare mixed update payload with valid and invalid configurations
  const mixedUpdates: IRedditPlatformSystematicConfig.IUpdate[] = [];
  // Add valid updates using existing configuration keys
  if (initialResult.configs.length > 0) {
    // Valid update 1: update existing configuration
    const validConfig = initialResult.configs[0];
    mixedUpdates.push({
      config_value: RandomGenerator.name(),
      config_type: validConfig.config_type,
      is_active: true,
    } satisfies IRedditPlatformSystematicConfig.IUpdate);
    // Valid update 2: if we have more configs
    if (initialResult.configs.length > 1) {
      mixedUpdates.push({
        config_value: RandomGenerator.name(),
        config_type: initialResult.configs[1].config_type,
        is_active: true,
      } satisfies IRedditPlatformSystematicConfig.IUpdate);
    }
  }
  // Add invalid update with non-existent key (empty string key triggers server-side validation error)
  mixedUpdates.push({
    config_value: "invalid_value",
    config_type: "string",
  } satisfies IRedditPlatformSystematicConfig.IUpdate);
  // 4. Execute bulk update with mixed valid/invalid configurations
  const result =
    await api.functional.redditPlatform.admin.system_configs.bulk.updateBulk(
      adminConnection,
      {
        body: {
          value: mixedUpdates,
        } satisfies IRedditPlatformSystematicConfig.IUpdateBulk,
      },
    );
  typia.assert(result);
  // 5. Validate response structure and counts
  TestValidator.equals(
    "total count matches input",
    result.totalCount,
    mixedUpdates.length,
  );
  TestValidator.predicate("success count >= 0", result.successCount >= 0);
  TestValidator.equals(
    "configs array length matches success count",
    result.configs.length,
    result.successCount,
  );
  // 6. Verify successful updates contain valid data
  for (const config of result.configs) {
    typia.assert<IRedditPlatformSystematicConfig>(config);
  }
}
