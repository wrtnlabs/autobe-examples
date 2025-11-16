import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test the deletion functionality of shopping mall configuration by an
 * authenticated admin.
 *
 * The test performs:
 *
 * 1. Admin registration and authentication via /auth/admin/join with required
 *    fields.
 * 2. Creation of a shopping mall configuration entry with necessary data.
 * 3. Deletion of the created configuration entry by its unique key.
 * 4. Validation that the creation key matches and deletion succeeds without error.
 */
export async function test_api_shopping_mall_configuration_deletion_by_admin(
  connection: api.IConnection,
) {
  // Generate unique admin email and configuration key
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const configurationKey = `test_key_${RandomGenerator.alphaNumeric(6)}`;

  // 1. Register admin user (join) and assure IShoppingMallAdmin.ICreate compliance
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "StrongPass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  // 2. Create a shopping mall configuration
  const configurationCreateBody = {
    key: configurationKey,
    value: RandomGenerator.alphaNumeric(12),
    description: `Test config desc ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 })}`,
    enabled: true,
    _adminNote: "Created by e2e test",
  } satisfies IShoppingMallConfiguration.ICreate;

  const createdConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallConfigurations.create(
      connection,
      {
        body: configurationCreateBody,
      },
    );
  typia.assert(createdConfiguration);

  TestValidator.equals(
    "created configuration key matches",
    createdConfiguration.key,
    configurationKey,
  );

  // 3. Delete the configuration by key
  await api.functional.shoppingMall.admin.shoppingMallConfigurations.erase(
    connection,
    {
      key: configurationKey,
    },
  );

  // No explicit 'read' verification exists, so success is confirmed by absence of error.
}
