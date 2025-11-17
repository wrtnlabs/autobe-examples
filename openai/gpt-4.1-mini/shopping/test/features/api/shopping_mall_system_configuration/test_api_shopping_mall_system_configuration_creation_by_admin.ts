import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";

/**
 * Validate creating a new shopping mall system configuration parameter as an
 * admin.
 *
 * This test covers the full workflow of admin authentication and authorized
 * creation of system configurations.
 *
 * 1. Admin joins the system with email and password.
 * 2. Upon successful authentication, the admin receives an authorization token.
 * 3. The admin creates a shopping mall system configuration with unique key,
 *    value, and description.
 * 4. Response is validated for correct field values and format correctness
 *    including UUID and ISO8601 timestamps.
 * 5. (Optional) Attempt unauthorized creation with a non-admin token or
 *    unauthenticated connection should be disallowed.
 *
 * This test ensures the security model, data integrity, and format compliance
 * of system configuration creation.
 */
export async function test_api_shopping_mall_system_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the shopping mall system, registering a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234"; // Simple password for test
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a unique configuration key
  const configKey = `test_config_key_${RandomGenerator.alphaNumeric(8)}`;
  // Prepare create request body
  const createBody = {
    key: configKey,
    value: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingMallSystemConfiguration.ICreate;

  // 3. Admin creates the shopping mall system configuration
  const configuration: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(configuration);

  // 4. Assertions for response fields
  TestValidator.predicate(
    "configuration id is non-empty string",
    typeof configuration.id === "string" && configuration.id.length > 0,
  );
  TestValidator.equals(
    "configuration key equals input",
    configuration.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value equals input",
    configuration.value,
    createBody.value,
  );
  TestValidator.equals(
    "configuration description equals input",
    configuration.description,
    createBody.description,
  );

  // Check timestamps are valid ISO date-time strings
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/;
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof configuration.created_at === "string" &&
      iso8601Regex.test(configuration.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof configuration.updated_at === "string" &&
      iso8601Regex.test(configuration.updated_at),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    configuration.deleted_at === null || configuration.deleted_at === undefined,
  );
}
