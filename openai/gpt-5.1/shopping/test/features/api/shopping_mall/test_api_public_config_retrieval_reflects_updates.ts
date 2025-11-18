import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_public_config_retrieval_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain admin authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create initial configuration entry
  const namespace = `e2e_public_config_${RandomGenerator.alphabets(8)}`;
  const configKey = `feature_toggle_${RandomGenerator.alphabets(8)}`;
  const environment = "e2e";

  const initialValueObject = {
    featureEnabled: true,
    rolloutPercentage: 25,
    note: "initial",
  } as const;
  const initialValueJson = JSON.stringify(initialValueObject);

  const initialDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    namespace,
    config_key: configKey,
    environment,
    description: initialDescription,
    value_json: initialValueJson,
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const initialConfig = await api.functional.shoppingMall.admin.configs.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert<IShoppingMallConfig>(initialConfig);

  // 3. Update the configuration entry with modified description and value_json
  const updatedValueObject = {
    featureEnabled: false,
    rolloutPercentage: 75,
    note: "updated",
  } as const;
  const updatedValueJson = JSON.stringify(updatedValueObject);

  const updatedDescription = `UPDATED: ${RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  })}`;

  const updateBody = {
    description: updatedDescription,
    value_json: updatedValueJson,
    is_active: true,
  } satisfies IShoppingMallConfig.IUpdate;

  const updatedConfig = await api.functional.shoppingMall.admin.configs.update(
    connection,
    {
      configId: initialConfig.id,
      body: updateBody,
    },
  );
  typia.assert<IShoppingMallConfig>(updatedConfig);

  // Validate invariants between initial and updated configs
  TestValidator.equals(
    "id is stable after update",
    updatedConfig.id,
    initialConfig.id,
  );
  TestValidator.equals(
    "namespace is stable after update",
    updatedConfig.namespace,
    initialConfig.namespace,
  );
  TestValidator.equals(
    "config_key is stable after update",
    updatedConfig.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "environment is stable after update",
    updatedConfig.environment,
    initialConfig.environment,
  );

  TestValidator.notEquals(
    "description changed after update",
    updatedConfig.description,
    initialConfig.description,
  );
  TestValidator.notEquals(
    "value_json changed after update",
    updatedConfig.value_json,
    initialConfig.value_json,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updatedConfig.created_at,
    initialConfig.created_at,
  );

  // 4. Public retrieval by namespace (endpoint is documented as public)
  const fetched = await api.functional.shoppingMall.configs.byNamespace.at(
    connection,
    {
      namespace: updatedConfig.namespace,
    },
  );
  typia.assert<IShoppingMallConfig>(fetched);

  // 5. Validate public response reflects updated configuration
  TestValidator.equals(
    "public id matches updated config",
    fetched.id,
    updatedConfig.id,
  );
  TestValidator.equals(
    "public namespace matches updated config",
    fetched.namespace,
    updatedConfig.namespace,
  );
  TestValidator.equals(
    "public config_key matches updated config",
    fetched.config_key,
    updatedConfig.config_key,
  );
  TestValidator.equals(
    "public environment matches updated config",
    fetched.environment,
    updatedConfig.environment,
  );
  TestValidator.equals(
    "public is_active matches updated config",
    fetched.is_active,
    updatedConfig.is_active,
  );
  TestValidator.equals(
    "public created_at matches updated config",
    fetched.created_at,
    updatedConfig.created_at,
  );

  TestValidator.equals(
    "public description reflects updated value",
    fetched.description,
    updatedConfig.description,
  );
  TestValidator.equals(
    "public value_json reflects updated value",
    fetched.value_json,
    updatedConfig.value_json,
  );
  TestValidator.equals(
    "public updated_at reflects updated timestamp",
    fetched.updated_at,
    updatedConfig.updated_at,
  );

  TestValidator.notEquals(
    "public description is not initial",
    fetched.description,
    initialConfig.description,
  );
  TestValidator.notEquals(
    "public value_json is not initial",
    fetched.value_json,
    initialConfig.value_json,
  );
  TestValidator.notEquals(
    "public updated_at is not initial",
    fetched.updated_at,
    initialConfig.updated_at,
  );
}
