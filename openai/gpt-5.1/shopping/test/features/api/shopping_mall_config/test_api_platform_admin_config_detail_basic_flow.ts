import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin can create and then read back a specific
 * configuration detail.
 *
 * Business flow:
 *
 * 1. Bootstrap a platform administrator using the join endpoint.
 * 2. As that admin, create a configuration row with a deterministic namespace/key
 *    pair.
 * 3. Retrieve the configuration detail by its id.
 * 4. Validate that the returned detail matches the created configuration on
 *    business fields and that type/shape matches IShoppingMallConfig.
 */
export async function test_api_platform_admin_config_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a configuration entry under a deterministic namespace/key
  const namespace = "checkout";
  const key = `max_cart_items_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    namespace,
    key,
    value: "100",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // Basic business field validation on created record
  TestValidator.equals(
    "created config namespace matches input",
    createdConfig.namespace,
    createBody.namespace,
  );
  TestValidator.equals(
    "created config key matches input",
    createdConfig.key,
    createBody.key,
  );
  TestValidator.equals(
    "created config value matches input",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created config description matches input",
    createdConfig.description,
    createBody.description,
  );
  TestValidator.equals(
    "created config active flag matches input",
    createdConfig.active,
    createBody.active,
  );

  // 3. Retrieve configuration detail by id
  const detailedConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.at(connection, {
      configId: createdConfig.id,
    });
  typia.assert<IShoppingMallConfig>(detailedConfig);

  // 4. Validate that business fields are consistent between create and detail
  TestValidator.equals(
    "detail config id matches created id",
    detailedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "detail config namespace matches created namespace",
    detailedConfig.namespace,
    createdConfig.namespace,
  );
  TestValidator.equals(
    "detail config key matches created key",
    detailedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "detail config value matches created value",
    detailedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "detail config description matches created description",
    detailedConfig.description,
    createdConfig.description,
  );
  TestValidator.equals(
    "detail config active flag matches created active flag",
    detailedConfig.active,
    createdConfig.active,
  );

  // 5. Sanity check on timestamps: created_at should be stable between create and detail
  TestValidator.equals(
    "detail created_at matches created created_at",
    detailedConfig.created_at,
    createdConfig.created_at,
  );

  // updated_at may be equal or later, but should not be earlier
  TestValidator.predicate(
    "detail updated_at is not earlier than created updated_at",
    new Date(detailedConfig.updated_at).getTime() >=
      new Date(createdConfig.updated_at).getTime(),
  );

  // deleted_at should remain consistent (most likely null) between create and detail
  TestValidator.equals(
    "detail deleted_at matches created deleted_at",
    detailedConfig.deleted_at,
    createdConfig.deleted_at,
  );
}
