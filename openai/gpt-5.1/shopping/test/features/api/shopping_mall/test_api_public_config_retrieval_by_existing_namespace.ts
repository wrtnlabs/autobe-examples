import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_public_config_retrieval_by_existing_namespace(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated admin context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a configuration entry
  const namespace = `public-config-${RandomGenerator.alphabets(8)}`;
  const configKey = `shippingOptions-${RandomGenerator.alphabets(5)}`;

  const createConfigBody = {
    namespace,
    config_key: configKey,
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({
      freeShippingThreshold: 50000,
      regions: ["KR", "US"],
      enabled: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createConfigBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Public (unauthenticated) retrieval by namespace
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const publicConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.configs.byNamespace.at(publicConnection, {
      namespace,
    });
  typia.assert<IShoppingMallConfig>(publicConfig);

  // 4. Validate consistency between admin-created config and public retrieval
  TestValidator.equals(
    "public config id matches created config id",
    publicConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "public config namespace matches",
    publicConfig.namespace,
    createdConfig.namespace,
  );
  TestValidator.equals(
    "public config key matches",
    publicConfig.config_key,
    createdConfig.config_key,
  );
  TestValidator.equals(
    "public config environment matches",
    publicConfig.environment,
    createdConfig.environment,
  );
  TestValidator.equals(
    "public config description matches",
    publicConfig.description ?? null,
    createdConfig.description ?? null,
  );
  TestValidator.equals(
    "public config value_json matches",
    publicConfig.value_json,
    createdConfig.value_json,
  );
  TestValidator.equals(
    "public config is_active matches",
    publicConfig.is_active,
    createdConfig.is_active,
  );
  TestValidator.equals(
    "public config created_at matches",
    publicConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "public config updated_at matches",
    publicConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "public config deleted_at matches",
    publicConfig.deleted_at ?? null,
    createdConfig.deleted_at ?? null,
  );
}
