import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_platform_configurations_create } from "../../../generate/generate_random_ecommerce_mall_admin_platform_configurations_create";
import { prepare_random_ecommerce_mall_platform_configuration } from "../../../prepare/prepare_random_ecommerce_mall_platform_configuration";

export async function test_api_platform_config_update_selective_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create initial platform configuration with all fields populated
  const originalConfiguration =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(originalConfiguration);
  // Store original values for comparison
  const originalIsActive = originalConfiguration.is_active;
  const originalConfigurationKey = originalConfiguration.configuration_key;
  const originalDescription = originalConfiguration.description;
  const originalConfigurationType = originalConfiguration.configuration_type;
  const originalScope = originalConfiguration.scope;
  const originalDefaultValue = originalConfiguration.default_value;
  const originalCreatedAt = originalConfiguration.created_at;
  const originalUpdatedAt = originalConfiguration.updated_at;
  // 3. Perform partial update with only is_active field inverted
  const newIsActive = !originalIsActive;
  const updateBody = {
    is_active: newIsActive,
  } satisfies IEcommerceMallPlatformConfiguration.IUpdate;
  const updatedConfiguration =
    await api.functional.ecommerceMall.admin.platform_configurations.update(
      adminConnection,
      {
        configId: originalConfiguration.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfiguration);
  // 4. Validate partial update behavior
  // Verify is_active was updated to new value
  TestValidator.equals(
    "is_active updated to inverted value",
    updatedConfiguration.is_active,
    newIsActive,
  );
  // Verify configuration_key remains unchanged (immutable field)
  TestValidator.equals(
    "configuration_key unchanged after partial update",
    updatedConfiguration.configuration_key,
    originalConfigurationKey,
  );
  // Verify description remains unchanged
  TestValidator.equals(
    "description unchanged after partial update",
    updatedConfiguration.description,
    originalDescription,
  );
  // Verify configuration_type remains unchanged
  TestValidator.equals(
    "configuration_type unchanged after partial update",
    updatedConfiguration.configuration_type,
    originalConfigurationType,
  );
  // Verify scope remains unchanged
  TestValidator.equals(
    "scope unchanged after partial update",
    updatedConfiguration.scope,
    originalScope,
  );
  // Verify default_value remains unchanged
  TestValidator.equals(
    "default_value unchanged after partial update",
    updatedConfiguration.default_value,
    originalDefaultValue,
  );
  // Verify created_at timestamp unchanged
  TestValidator.equals(
    "created_at unchanged after partial update",
    updatedConfiguration.created_at,
    originalCreatedAt,
  );
  // Verify updated_at was modified (later than original)
  TestValidator.predicate(
    "updated_at modified after partial update",
    new Date(updatedConfiguration.updated_at) > new Date(originalUpdatedAt),
  );
  // Verify deleted_at remains null (no soft deletion)
  TestValidator.equals(
    "deleted_at remains null after partial update",
    updatedConfiguration.deleted_at,
    null,
  );
}
