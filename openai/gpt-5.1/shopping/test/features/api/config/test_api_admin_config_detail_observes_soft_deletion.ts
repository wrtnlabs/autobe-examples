import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_admin_config_detail_observes_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Join as an admin so that admin config endpoints are authorized
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a new configuration entry
  const configCreateBody = {
    namespace: "checkout",
    config_key: `maxCartItems-${RandomGenerator.alphaNumeric(8)}`,
    environment: "staging",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({
      maxCartItems: 50,
      enforce: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Read back the same configuration via detail endpoint
  const fetchedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert<IShoppingMallConfig>(fetchedConfig);

  // 4. Business field consistency validations
  TestValidator.equals(
    "detail endpoint returns the same config id as created",
    fetchedConfig.id,
    createdConfig.id,
  );

  TestValidator.equals(
    "namespace is preserved between create and detail",
    fetchedConfig.namespace,
    createdConfig.namespace,
  );

  TestValidator.equals(
    "config_key is preserved between create and detail",
    fetchedConfig.config_key,
    createdConfig.config_key,
  );

  TestValidator.equals(
    "environment is preserved between create and detail",
    fetchedConfig.environment,
    createdConfig.environment,
  );

  TestValidator.equals(
    "value_json is preserved between create and detail",
    fetchedConfig.value_json,
    createdConfig.value_json,
  );

  TestValidator.equals(
    "is_active flag is preserved between create and detail",
    fetchedConfig.is_active,
    createdConfig.is_active,
  );

  // 5. Soft deletion semantics for a freshly created configuration:
  //    deleted_at should not be set (null or undefined),
  //    confirming that active configs are not mis-marked as deleted.
  TestValidator.predicate(
    "freshly created config must not be soft-deleted (deleted_at is null or undefined)",
    fetchedConfig.deleted_at === null || fetchedConfig.deleted_at === undefined,
  );
}
