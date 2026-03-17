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

export async function test_api_platform_config_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration with authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create platform configuration to be updated (using admin connection)
  const configuration =
    await generate_random_ecommerce_mall_super_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "test_update_config_key",
          description: "Original description for test",
          configuration_type: "string" as const,
          scope: "global" as const,
          default_value: "original_value",
          is_active: true,
        },
      },
    );
  typia.assert(configuration);
  // 3. Update configuration with partial data (using admin connection)
  const updatedConfiguration =
    await api.functional.ecommerceMall.superAdmin.platform_configurations.update(
      adminConnection,
      {
        configId: configuration.id,
        body: {
          description: "Updated description for test",
          configuration_type: "integer" as const,
          scope: "staging" as const,
          default_value: "updated_value",
          is_active: false,
        },
      },
    );
  typia.assert(updatedConfiguration);
  // 4. Validate the update response
  TestValidator.equals(
    "configuration_key unchanged",
    updatedConfiguration.configuration_key,
    configuration.configuration_key,
  );
  TestValidator.equals(
    "description updated",
    updatedConfiguration.description,
    "Updated description for test",
  );
  TestValidator.equals(
    "configuration_type updated",
    updatedConfiguration.configuration_type,
    "integer",
  );
  TestValidator.equals("scope updated", updatedConfiguration.scope, "staging");
  TestValidator.equals(
    "default_value updated",
    updatedConfiguration.default_value,
    "updated_value",
  );
  TestValidator.equals(
    "is_active updated",
    updatedConfiguration.is_active,
    false,
  );
  TestValidator.notEquals(
    "updated_at changed",
    configuration.updated_at,
    updatedConfiguration.updated_at,
  );
  TestValidator.equals(
    "id unchanged",
    updatedConfiguration.id,
    configuration.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedConfiguration.created_at,
    configuration.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedConfiguration.deleted_at,
    configuration.deleted_at,
  );
}
