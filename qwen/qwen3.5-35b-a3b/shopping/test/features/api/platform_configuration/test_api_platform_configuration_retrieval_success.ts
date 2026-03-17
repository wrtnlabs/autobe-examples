import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function test_api_platform_configuration_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup superAdmin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create platform configuration
  const platformConfig: IEcommerceMallPlatformConfiguration.ICreate = {
    configuration_key: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<128>
    >(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    configuration_type: "string",
    scope: "global",
    default_value: null,
    is_active: true,
  };
  const createdConfig =
    await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
      superAdminConnection,
      { body: platformConfig },
    );
  typia.assert(createdConfig);
  // 3. Retrieve platform configuration
  const retrievedConfig =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.at(
      superAdminConnection,
      {
        configId: createdConfig.id,
      },
    );
  typia.assert(retrievedConfig);
  // 4. Validate retrieved configuration matches created data
  TestValidator.equals(
    "configuration_key matches",
    retrievedConfig.configuration_key,
    createdConfig.configuration_key,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfig.description,
    createdConfig.description,
  );
  TestValidator.equals(
    "configuration_type matches",
    retrievedConfig.configuration_type,
    createdConfig.configuration_type,
  );
  TestValidator.equals(
    "scope matches",
    retrievedConfig.scope,
    createdConfig.scope,
  );
  TestValidator.equals(
    "default_value matches",
    retrievedConfig.default_value,
    createdConfig.default_value,
  );
  TestValidator.equals(
    "is_active matches",
    retrievedConfig.is_active,
    createdConfig.is_active,
  );
  TestValidator.equals(
    "id matches request configId",
    retrievedConfig.id,
    createdConfig.id,
  );
  // 5. Validate timestamps are present and valid
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedConfig.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedConfig.updated_at)),
  );
  // 6. Validate soft deletion status
  TestValidator.equals(
    "not soft-deleted (deleted_at is null)",
    retrievedConfig.deleted_at,
    null,
  );
}
