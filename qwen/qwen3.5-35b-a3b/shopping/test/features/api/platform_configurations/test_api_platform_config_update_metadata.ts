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

export async function test_api_platform_config_update_metadata(
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
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create initial platform configuration
  const initialConfig =
    await generate_random_ecommerce_mall_admin_platform_configurations_create(
      adminConnection,
      {
        body: {
          configuration_key: "test_config",
          description: "Initial description",
          configuration_type: "string",
          scope: "global",
          default_value: "initial",
          is_active: true,
        } satisfies IEcommerceMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // 3. Update configuration
  const updatedConfig =
    await api.functional.ecommerceMall.admin.platform_configurations.update(
      adminConnection,
      {
        configId: initialConfig.id,
        body: {
          description: "Updated description for testing",
          configuration_type: "integer",
          scope: "production",
          default_value: "100",
          is_active: false,
        } satisfies IEcommerceMallPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate all fields
  TestValidator.equals(
    "configuration_key remains unchanged",
    updatedConfig.configuration_key,
    initialConfig.configuration_key,
  );
  TestValidator.equals(
    "description updated",
    updatedConfig.description,
    "Updated description for testing",
  );
  TestValidator.equals(
    "configuration_type changed",
    updatedConfig.configuration_type,
    "integer",
  );
  TestValidator.equals("scope updated", updatedConfig.scope, "production");
  TestValidator.equals(
    "default_value changed",
    updatedConfig.default_value,
    "100",
  );
  TestValidator.equals("is_active toggled", updatedConfig.is_active, false);
  TestValidator.predicate(
    "updated_at is modified",
    new Date(updatedConfig.updated_at) > new Date(initialConfig.updated_at),
  );
}
