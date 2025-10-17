import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallConfigurations } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigurations";

/**
 * Tests successful update of an existing shopping mall configuration parameter
 * by an admin.
 *
 * The workflow:
 *
 * 1. Admin joins to authenticate and acquire authorization token.
 * 2. An initial configuration parameter is created with valid fields.
 * 3. The admin updates the configuration using PUT with new value, category,
 *    description, and enabled flag.
 * 4. Assert the returned updated configuration matches the update input and
 *    retains immutable properties like id, key, and creation timestamp.
 * 5. Validate proper updated_at timestamp reflecting the modification.
 */
export async function test_api_shopping_mall_configuration_update_successful(
  connection: api.IConnection,
) {
  // 1. Admin joins for authentication
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  // 2. Create initial configuration
  const createBody = {
    key: `config_${RandomGenerator.alphabets(5)}`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    category: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    enabled: true,
  } satisfies IShoppingMallConfiguration.ICreate;

  const createdConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.shoppingMall.configurations.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches",
    createdConfig.key,
    createBody.key,
  );

  // 3. Update configuration with new data
  const updateBody = {
    value: RandomGenerator.paragraph({ sentences: 5 }),
    category: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 3 }),
    enabled: false,
  } satisfies IShoppingMallConfigurations.IUpdate;

  const updatedConfig: IShoppingMallConfigurations =
    await api.functional.shoppingMall.admin.shoppingMall.configurations.update(
      connection,
      {
        configurationId: createdConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // 4. Assert unchanged properties remain (id, key, created_at)
  TestValidator.equals(
    "updated config id unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "updated config key unchanged",
    updatedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "updated config created_at unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );

  // 5. Assert updated properties reflect new values
  TestValidator.equals(
    "updated config value matches",
    updatedConfig.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated config category matches",
    updatedConfig.category,
    updateBody.category,
  );
  TestValidator.equals(
    "updated config description matches",
    updatedConfig.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated config enabled flag matches",
    updatedConfig.enabled,
    updateBody.enabled,
  );

  // 6. Assert updated_at is updated and different from created_at
  TestValidator.predicate(
    "updated_at is later than created_at",
    Date.parse(updatedConfig.updated_at) > Date.parse(updatedConfig.created_at),
  );
}
