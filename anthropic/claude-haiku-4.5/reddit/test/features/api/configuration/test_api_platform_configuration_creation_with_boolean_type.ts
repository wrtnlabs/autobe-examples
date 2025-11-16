import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of boolean-type platform configuration settings.
 *
 * This test validates that administrators can create configurations storing
 * boolean values ('true' or 'false') with proper data type specification. The
 * test verifies that boolean configurations are created correctly with the
 * data_type field set to 'boolean', values are stored as string
 * representations, and configurations are properly validated.
 *
 * Test workflow:
 *
 * 1. Authenticate as an administrator
 * 2. Create a boolean-type configuration with value 'true'
 * 3. Verify the configuration is created with correct fields
 * 4. Create a second boolean configuration with value 'false'
 * 5. Validate both boolean states work correctly
 */
export async function test_api_platform_configuration_creation_with_boolean_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPassword123!";
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      name: adminName,
      href: "http://localhost:3000/admin",
      referrer: null,
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "administrator should be authenticated with valid token",
    adminAuth.token.access.length > 0,
  );

  // Step 2: Create a boolean-type configuration with value 'true'
  const booleanConfigTrue =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "voting_enabled",
          value: "true",
          description:
            "Controls whether voting feature is enabled platform-wide",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfigTrue);

  // Step 3: Verify the configuration is created with correct fields
  TestValidator.equals(
    "configuration key should be 'voting_enabled'",
    booleanConfigTrue.key,
    "voting_enabled",
  );
  TestValidator.equals(
    "configuration value should be 'true'",
    booleanConfigTrue.value,
    "true",
  );
  TestValidator.equals(
    "configuration data_type should be 'boolean'",
    booleanConfigTrue.data_type,
    "boolean",
  );
  TestValidator.predicate(
    "configuration should have a valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      booleanConfigTrue.id,
    ),
  );
  TestValidator.predicate(
    "configuration should have created_at timestamp",
    booleanConfigTrue.created_at !== null &&
      booleanConfigTrue.created_at !== undefined,
  );
  TestValidator.predicate(
    "configuration should have updated_at timestamp",
    booleanConfigTrue.updated_at !== null &&
      booleanConfigTrue.updated_at !== undefined,
  );

  // Step 4: Create a second boolean configuration with value 'false'
  const booleanConfigFalse =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "analytics_enabled",
          value: "false",
          description: "Controls whether analytics tracking is enabled",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfigFalse);

  // Step 5: Validate both boolean states work correctly
  TestValidator.equals(
    "second configuration value should be 'false'",
    booleanConfigFalse.value,
    "false",
  );
  TestValidator.equals(
    "second configuration data_type should be 'boolean'",
    booleanConfigFalse.data_type,
    "boolean",
  );
  TestValidator.notEquals(
    "two configurations should have different IDs",
    booleanConfigTrue.id,
    booleanConfigFalse.id,
  );
  TestValidator.notEquals(
    "two configurations should have different keys",
    booleanConfigTrue.key,
    booleanConfigFalse.key,
  );

  // Verify both configurations can be used as feature flags
  TestValidator.predicate(
    "first boolean config represents enabled state (true)",
    booleanConfigTrue.value === "true",
  );
  TestValidator.predicate(
    "second boolean config represents disabled state (false)",
    booleanConfigFalse.value === "false",
  );
}
