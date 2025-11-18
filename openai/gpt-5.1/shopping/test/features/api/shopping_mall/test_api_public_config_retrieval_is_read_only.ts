import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

export async function test_api_public_config_retrieval_is_read_only(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context for config creation.
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

  // 2. Create a concrete configuration row via admin configs.create.
  const namespace = `checkout_${RandomGenerator.alphabets(8)}`;
  const createBody = {
    namespace,
    config_key: `maxItems_${RandomGenerator.alphabets(6)}`,
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    value_json: JSON.stringify({ maxCartItems: 50, featureFlag: true }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  const baselineConfig: IShoppingMallConfig = { ...createdConfig };

  // 3. Prepare an unauthenticated connection for public GET access by namespace.
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Call the public GET-by-namespace endpoint multiple times without auth.
  const firstPublicFetch: IShoppingMallConfig =
    await api.functional.shoppingMall.configs.byNamespace.at(publicConnection, {
      namespace,
    });
  typia.assert<IShoppingMallConfig>(firstPublicFetch);

  const secondPublicFetch: IShoppingMallConfig =
    await api.functional.shoppingMall.configs.byNamespace.at(publicConnection, {
      namespace,
    });
  typia.assert<IShoppingMallConfig>(secondPublicFetch);

  const thirdPublicFetch: IShoppingMallConfig =
    await api.functional.shoppingMall.configs.byNamespace.at(publicConnection, {
      namespace,
    });
  typia.assert<IShoppingMallConfig>(thirdPublicFetch);

  // 5. Re-fetch via admin detail endpoint to confirm persisted state.
  const finalAdminConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert<IShoppingMallConfig>(finalAdminConfig);

  // 6. Assert that public GETs did not alter any fields.
  TestValidator.equals(
    "public fetch returns same config as baseline",
    firstPublicFetch,
    baselineConfig,
  );
  TestValidator.equals(
    "repeated public fetch returns identical config",
    secondPublicFetch,
    baselineConfig,
  );
  TestValidator.equals(
    "third public fetch returns identical config",
    thirdPublicFetch,
    baselineConfig,
  );

  TestValidator.equals(
    "admin detail after public reads matches baseline config",
    finalAdminConfig,
    baselineConfig,
  );
}
