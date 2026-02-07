import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_system_configs_create } from "../../../generate/generate_random_community_admin_system_configs_create";
import { prepare_random_community_system_config } from "../../../prepare/prepare_random_community_system_config";

export async function test_api_system_config_disable_community_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Create system configuration: enable_community_search with value true
  const configCreate = {
    name: "enable_community_search",
    type: "boolean",
    value: true,
  } satisfies ICommunitySystemConfig.ICreate;
  const createdConfig =
    await generate_random_community_admin_system_configs_create(
      adminConnection,
      {
        body: configCreate,
      },
    );
  // The ICommunitySystemConfig type is empty but the actual response has properties.
  // We'll cast to a more appropriate type based on the API structure
  const createdConfigTyped = typia.assert<{
    id: string;
    name: string;
    type: string;
    value: boolean | string | number | object;
    created_at: string;
    updated_at: string;
  }>(createdConfig);
  // 3. Update configuration: disable_community_search by setting value to false
  const configId = createdConfigTyped.id;
  const updateConfig = {
    name: createdConfigTyped.name,
    type: createdConfigTyped.type,
    value: false,
  } satisfies ICommunitySystemConfig;
  const updatedConfig =
    await api.functional.community.admin.system_configs.update(
      adminConnection,
      {
        configId,
        body: updateConfig,
      },
    );
  const updatedConfigTyped = typia.assert<{
    id: string;
    name: string;
    type: string;
    value: boolean | string | number | object;
    created_at: string;
    updated_at: string;
  }>(updatedConfig);
  // 4. Validate: configuration value was updated to false, type preserved
  TestValidator.equals(
    "value updated to false",
    updatedConfigTyped.value as boolean,
    false,
  );
  TestValidator.equals("type preserved", updatedConfigTyped.type, "boolean");
  TestValidator.equals("id preserved", updatedConfigTyped.id, configId);
  TestValidator.notEquals(
    "updated_at changed",
    updatedConfigTyped.updated_at,
    createdConfigTyped.updated_at,
  );
  // 5. Verify type cannot be changed (negative test)
  const invalidUpdate = {
    name: createdConfigTyped.name,
    type: "string", // Attempt to change type - this should fail
    value: false, // Keep value as boolean
  } satisfies ICommunitySystemConfig;
  await TestValidator.error("type change should be rejected", async () => {
    await api.functional.community.admin.system_configs.update(
      adminConnection,
      {
        configId,
        body: invalidUpdate,
      },
    );
  });
}
