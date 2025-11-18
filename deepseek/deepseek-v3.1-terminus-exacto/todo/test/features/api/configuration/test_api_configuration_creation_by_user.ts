import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete workflow of creating a new configuration definition by an
 * authenticated user.
 *
 * This scenario validates that users can successfully create configuration
 * definitions with proper metadata, validation rules, and default values. The
 * test begins with user authentication, then creates a configuration definition
 * and verifies that all required fields are populated correctly, including
 * system-generated fields like ID, version, and timestamps.
 */
export async function test_api_configuration_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a user to establish proper authorization context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a new configuration definition
  const configurationData = {
    config_key: "ui.theme.primary_color",
    name: "Primary Theme Color",
    description:
      "The primary color used throughout the application UI for branding purposes",
    data_type: "string",
    default_value: "#3b82f6",
    validation_rules: '{"pattern": "^#[0-9A-Fa-f]{6}$"}',
    category: "ui",
    is_sensitive: false,
    is_required: true,
  } satisfies ITodoAppConfiguration.ICreate;

  const configuration = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: configurationData,
    },
  );
  typia.assert(configuration);

  // Step 3: Validate that all required fields are properly populated
  TestValidator.equals(
    "configuration ID is generated",
    typeof configuration.id,
    "string",
  );

  TestValidator.equals(
    "config_key matches input",
    configuration.config_key,
    configurationData.config_key,
  );
  TestValidator.equals(
    "name matches input",
    configuration.name,
    configurationData.name,
  );
  TestValidator.equals(
    "description matches input",
    configuration.description,
    configurationData.description,
  );
  TestValidator.equals(
    "data_type matches input",
    configuration.data_type,
    configurationData.data_type,
  );
  TestValidator.equals(
    "default_value matches input",
    configuration.default_value,
    configurationData.default_value,
  );
  TestValidator.equals(
    "validation_rules matches input",
    configuration.validation_rules,
    configurationData.validation_rules,
  );
  TestValidator.equals(
    "category matches input",
    configuration.category,
    configurationData.category,
  );
  TestValidator.equals(
    "is_sensitive matches input",
    configuration.is_sensitive,
    configurationData.is_sensitive,
  );
  TestValidator.equals(
    "is_required matches input",
    configuration.is_required,
    configurationData.is_required,
  );

  // Step 4: Validate system-generated fields
  TestValidator.predicate("version is assigned", configuration.version >= 1);
  TestValidator.predicate(
    "created_at is assigned",
    configuration.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is assigned",
    configuration.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is undefined for new configuration",
    configuration.deleted_at,
    undefined,
  );

  // Step 5: Validate business rules - configuration key uniqueness
  // Attempt to create another configuration with the same key should fail
  await TestValidator.error("duplicate config_key should fail", async () => {
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        ...configurationData,
        name: "Duplicate Configuration",
      } satisfies ITodoAppConfiguration.ICreate,
    });
  });
}
