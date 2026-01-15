import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";
import { prepare_random_shopping_mall_platform_configuration } from "../../../prepare/prepare_random_shopping_mall_platform_configuration";
import { generate_random_shopping_mall_admin_platform_configurations_create } from "../../../generate/generate_random_shopping_mall_admin_platform_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_platform_configuration_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate platform configuration with valid properties
  const configKey = `feature_flag.${RandomGenerator.alphaNumeric(8)}`;
  const configValue = JSON.stringify({
    enabled: true,
    timeout: 3000,
    retryAttempts: 3,
  });
  const description = RandomGenerator.paragraph({ sentences: 5 });
  // Step 3: Create platform configuration using admin connection
  const createdConfig: IShoppingMallPlatformConfiguration =
    await api.functional.shoppingMall.admin.platform.configurations.create(
      adminConnection,
      {
        body: {
          name: configKey,
          value: configValue,
          description,
        } satisfies IShoppingMallPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  // Step 4: Validate all required fields in response
  TestValidator.equals(
    "config_key matches input",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals("value matches input", createdConfig.value, configValue);
  TestValidator.equals(
    "description matches input",
    createdConfig.description,
    description,
  );
  // Step 5: Validate audit metadata is present
  const validatedConfig = typia.assert<IShoppingMallPlatformConfiguration & {
    id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  }>(createdConfig);
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      validatedConfig.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      validatedConfig.created_at,
    ),
  );
}