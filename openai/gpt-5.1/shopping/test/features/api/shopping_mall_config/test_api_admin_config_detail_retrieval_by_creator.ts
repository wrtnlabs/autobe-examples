import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_config_detail_retrieval_by_creator(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new configuration as this admin
  const valueObject = {
    featureFlag: true,
    maxItems: 100,
  };
  const createConfigBody = {
    namespace: "checkout",
    config_key: "maxCartItems",
    environment: "staging",
    description: "Maximum number of items allowed in cart before warning.",
    value_json: JSON.stringify(valueObject),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createConfigBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Retrieve the configuration detail by id
  const fetchedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert<IShoppingMallConfig>(fetchedConfig);

  // 4. Field-by-field equality validation
  TestValidator.equals(
    "config id should match",
    fetchedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "config namespace should match",
    fetchedConfig.namespace,
    createdConfig.namespace,
  );
  TestValidator.equals(
    "config key should match",
    fetchedConfig.config_key,
    createdConfig.config_key,
  );
  TestValidator.equals(
    "config environment should match",
    fetchedConfig.environment,
    createdConfig.environment,
  );
  TestValidator.equals(
    "config description should match",
    fetchedConfig.description ?? null,
    createdConfig.description ?? null,
  );
  TestValidator.equals(
    "config value_json should match",
    fetchedConfig.value_json,
    createdConfig.value_json,
  );
  TestValidator.equals(
    "config is_active should match",
    fetchedConfig.is_active,
    createdConfig.is_active,
  );
  TestValidator.equals(
    "config created_at should match",
    fetchedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.equals(
    "config updated_at should match",
    fetchedConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "config deleted_at should match",
    fetchedConfig.deleted_at ?? null,
    createdConfig.deleted_at ?? null,
  );
}
