import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";

/**
 * Validate that an administrator can create a new system configuration entry
 * with a unique config key and value.
 *
 * The test flow:
 *
 * 1. Register a new unique admin account for testing using the admin join API.
 * 2. Using the new admin session, create a new unique configuration entry with a
 *    unique config_key and config_value.
 * 3. Assert that the response contains all required fields: id (uuid), config_key,
 *    config_value, (optional) description (null or random value), created_at,
 *    updated_at (ISO datetime), deleted_at (must be null or undefined on
 *    creation).
 * 4. Try to create another configuration with the same config_key and expect a
 *    validation error for uniqueness constraint violation.
 */
export async function test_api_admin_system_configuration_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin (for session and privilege)
  const email = `${RandomGenerator.alphaNumeric(8)}@admin-example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: email,
      password: password,
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a unique configuration entry
  const configKey = `autotest.feature.${RandomGenerator.alphaNumeric(10)}`;
  const configValue = RandomGenerator.paragraph();
  const configDescription = RandomGenerator.paragraph({ sentences: 4 });
  const createBody = {
    config_key: configKey,
    config_value: configValue,
    description: configDescription,
  } satisfies IShoppingSystemConfiguration.ICreate;
  const createdConfig =
    await api.functional.shopping.admin.systemConfigurations.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdConfig);

  // 3. Assert all relevant fields in the response
  TestValidator.predicate(
    "system config id is valid uuid",
    typia.is<string & tags.Format<"uuid">>(createdConfig.id),
  );
  TestValidator.equals(
    "system config key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "system config value matches",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "system config description matches",
    createdConfig.description,
    configDescription,
  );
  TestValidator.predicate(
    "created_at is an ISO datetime",
    typia.is<string & tags.Format<"date-time">>(createdConfig.created_at),
  );
  TestValidator.predicate(
    "updated_at is an ISO datetime",
    typia.is<string & tags.Format<"date-time">>(createdConfig.updated_at),
  );
  TestValidator.equals(
    "newly created system config deleted_at is null/undefined",
    createdConfig.deleted_at,
    null,
  );

  // 4. Attempt to create duplicate config_key (should fail)
  await TestValidator.error(
    "duplicate system config key fails uniqueness validation",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.create(
        connection,
        { body: createBody },
      );
    },
  );
}
