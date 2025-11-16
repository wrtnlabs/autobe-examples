import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of platform configurations without optional data_type
 * specification.
 *
 * This test validates that administrators can create configurations while
 * omitting the optional data_type field. It verifies that configurations are
 * created successfully when data_type is not provided, ensuring the system
 * properly handles missing optional fields and that the configuration still
 * functions in the system.
 *
 * Test workflow:
 *
 * 1. Administrator authenticates via the join endpoint to establish credentials
 * 2. Create a configuration without specifying the optional data_type field
 * 3. Verify the response contains the created configuration
 * 4. Validate that data_type is null or properly handled when not provided
 * 5. Confirm the configuration is properly stored and accessible
 */
export async function test_api_platform_configuration_creation_without_data_type(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/setup",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be authenticated with valid token",
    admin.token.access.length > 0,
  );

  // Step 2: Create a configuration without data_type field
  const configKey = RandomGenerator.alphabets(10);
  const configValue = RandomGenerator.paragraph({ sentences: 3 });
  const configDescription = RandomGenerator.paragraph({ sentences: 2 });

  const configuration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
          // data_type is intentionally omitted to test optional field handling
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);

  // Step 3 & 4: Verify response structure and data_type handling
  TestValidator.equals(
    "configuration key matches",
    configuration.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches",
    configuration.value,
    configValue,
  );
  TestValidator.equals(
    "configuration description matches",
    configuration.description,
    configDescription,
  );

  // Validate that data_type is null when not provided
  TestValidator.predicate(
    "data_type should be null when not provided",
    configuration.data_type === null,
  );

  // Step 5: Verify configuration has required fields
  TestValidator.predicate(
    "configuration should have valid id",
    typeof configuration.id === "string" && configuration.id.length > 0,
  );
  TestValidator.predicate(
    "configuration should have created_at timestamp",
    typeof configuration.created_at === "string" &&
      configuration.created_at.length > 0,
  );
  TestValidator.predicate(
    "configuration should have updated_at timestamp",
    typeof configuration.updated_at === "string" &&
      configuration.updated_at.length > 0,
  );

  // Verify the configuration was successfully created without data_type specification
  TestValidator.predicate(
    "configuration creation without data_type should succeed",
    configuration.id !== undefined && configuration.key !== undefined,
  );
}
