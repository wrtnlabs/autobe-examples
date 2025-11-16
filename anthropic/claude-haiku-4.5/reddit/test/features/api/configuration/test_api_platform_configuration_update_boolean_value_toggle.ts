import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates the lifecycle of boolean configuration toggling.
 *
 * Tests the complete boolean configuration toggle workflow:
 *
 * 1. Administrator authentication
 * 2. Create boolean configuration with initial 'true' value
 * 3. Update to toggle to 'false'
 * 4. Verify change takes effect immediately
 * 5. Update to toggle back to 'true'
 * 6. Confirm final state matches expected value
 *
 * This validates that platform feature flags can be toggled to enable or
 * disable functionality, and that changes propagate immediately across the
 * platform without requiring restart.
 */
export async function test_api_platform_configuration_update_boolean_value_toggle(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureAdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create a boolean configuration with initial value 'true'
  const configKey = `voting_enabled_${RandomGenerator.alphaNumeric(6)}`;
  const initialConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: "true",
          description: "Feature flag to enable or disable voting functionality",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  TestValidator.equals(
    "initial configuration value should be true",
    initialConfig.value,
    "true",
  );
  TestValidator.equals(
    "configuration data_type should be boolean",
    initialConfig.data_type,
    "boolean",
  );

  // Step 3: Update configuration to toggle to 'false'
  const toggledToFalse: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: "false",
          description: "Feature flag disabled - voting is now disabled",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(toggledToFalse);
  TestValidator.equals(
    "toggled configuration value should be false",
    toggledToFalse.value,
    "false",
  );
  TestValidator.equals(
    "configuration key should remain unchanged",
    toggledToFalse.key,
    initialConfig.key,
  );

  // Step 4: Verify the change takes effect immediately by toggling back to 'true'
  const toggledBackToTrue: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configKey,
        body: {
          value: "true",
          description: "Feature flag re-enabled - voting is now active",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(toggledBackToTrue);
  TestValidator.equals(
    "re-toggled configuration value should be true",
    toggledBackToTrue.value,
    "true",
  );

  // Step 5: Verify state consistency across multiple toggles
  TestValidator.notEquals(
    "final state should differ from false state",
    toggledBackToTrue.value,
    toggledToFalse.value,
  );
  TestValidator.equals(
    "final configuration should match initial value",
    toggledBackToTrue.value,
    initialConfig.value,
  );

  // Step 6: Validate metadata persistence
  TestValidator.predicate(
    "updated_at should be updated on each toggle",
    () =>
      new Date(toggledBackToTrue.updated_at).getTime() >=
      new Date(toggledToFalse.updated_at).getTime(),
  );
}
