import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test configuration creation with complete field set including key, value,
 * description, and category.
 *
 * This test validates that system-level configuration settings can be created
 * with all optional fields populated, ensuring proper handling of descriptive
 * information for administrative purposes. The test follows a realistic
 * workflow where an authenticated user creates comprehensive configuration
 * entries with human-readable descriptions and logical categorization.
 */
export async function test_api_configuration_creation_complete_field_set(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration with complete field set
  const configurationData = {
    key: `ui.theme.${RandomGenerator.alphabets(5)}`,
    value: "dark",
    description:
      "Controls whether dark theme is enabled system-wide. Accepts 'true'/'false' values.",
    category: "ui",
  } satisfies ITodoListConfiguration.ICreate;

  const configuration =
    await api.functional.todolist.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(configuration);

  // Step 3: Validate response matches input data
  TestValidator.equals(
    "configuration key matches input",
    configuration.key,
    configurationData.key,
  );
  TestValidator.equals(
    "configuration value matches input",
    configuration.value,
    configurationData.value,
  );
  TestValidator.equals(
    "configuration description matches input",
    configuration.description,
    configurationData.description,
  );
  TestValidator.equals(
    "configuration category matches input",
    configuration.category,
    configurationData.category,
  );

  // Step 4: Validate system-generated fields (typia.assert already validated UUID and timestamp formats)
  TestValidator.predicate(
    "configuration ID is generated",
    configuration.id.length > 0,
  );
  TestValidator.predicate(
    "configuration has creation timestamp",
    configuration.created_at.length > 0,
  );
  TestValidator.predicate(
    "configuration has update timestamp",
    configuration.updated_at.length > 0,
  );
  TestValidator.equals(
    "configuration deleted_at is null for active entry",
    configuration.deleted_at,
    undefined,
  );
}
