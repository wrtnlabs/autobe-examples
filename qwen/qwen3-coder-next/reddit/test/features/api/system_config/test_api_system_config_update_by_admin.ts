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

export async function test_api_system_config_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account with unique credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(2);
  const adminPassword = "12345678";
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Create a test system configuration
  const configKey = "test_config_" + RandomGenerator.alphabets(8);
  const createResponse =
    await api.functional.redditPlatform.admin.system_configs.update(
      adminConnection,
      {
        configKey: configKey,
        body: {
          config_value: "initial_value",
          config_type: "string",
          description: "Initial test configuration",
          is_active: true,
        } satisfies IRedditPlatformSystematicConfig.IUpdate,
      },
    );
  typia.assert(createResponse);
  // Step 3: Update the configuration with partial data
  const updatedConfig =
    await api.functional.redditPlatform.admin.system_configs.update(
      adminConnection,
      {
        configKey: configKey,
        body: {
          config_value: "updated_value",
          description: "Updated test configuration description",
        } satisfies IRedditPlatformSystematicConfig.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Step 4: Verify the configuration was updated correctly
  TestValidator.equals(
    "config_value updated",
    updatedConfig.config_value,
    "updated_value",
  );
  TestValidator.equals(
    "description updated",
    updatedConfig.description,
    "Updated test configuration description",
  );
  TestValidator.equals(
    "config_type preserved",
    updatedConfig.config_type,
    "string",
  );
  TestValidator.equals("is_active preserved", updatedConfig.is_active, true);
  // Step 5: Verify the configuration exists and has correct values
  TestValidator.predicate(
    "config has updated timestamp",
    updatedConfig.updated_at !== undefined && updatedConfig.updated_at !== null,
  );
  TestValidator.predicate(
    "config has valid id",
    /^[0-9a-f-]{36}$/i.test(updatedConfig.id),
  );
}
