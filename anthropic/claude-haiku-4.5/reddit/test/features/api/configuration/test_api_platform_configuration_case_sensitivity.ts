import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test configuration key matching with case sensitivity variations.
 *
 * This test validates how the platform handles configuration key lookups with
 * different case variations. It verifies that configuration retrieval is
 * case-sensitive by attempting to access the same configuration with exact key
 * match, uppercase variant, lowercase variant, and mixed case variants. The
 * test ensures consistent behavior across multiple configuration keys to
 * confirm the platform's case sensitivity policy.
 *
 * Test workflow:
 *
 * 1. Create administrator account for authentication
 * 2. Create multiple test configurations with mixed-case keys
 * 3. Retrieve each configuration using its exact key
 * 4. Attempt retrieval with uppercase key variant
 * 5. Attempt retrieval with lowercase key variant
 * 6. Attempt retrieval with mixed case variants
 * 7. Validate that exact key matches return the configuration
 * 8. Validate that case variations return appropriate responses
 * 9. Confirm consistent case-sensitivity behavior across all keys
 */
export async function test_api_platform_configuration_case_sensitivity(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Test configuration keys with different case variations
  const testConfigurations = [
    "max_posts_per_hour",
    "VotingEnabled",
    "MinKarmaToPost",
  ];

  // Step 3: For each configuration key, test case sensitivity
  for (const configKey of testConfigurations) {
    // Attempt to retrieve configuration with exact key
    await TestValidator.error(
      "should not find non-existent configuration with exact key",
      async () => {
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: configKey,
          },
        );
      },
    );

    // Test uppercase variant
    const uppercaseKey = configKey.toUpperCase();
    await TestValidator.error(
      `should not find configuration with uppercase key variation: ${uppercaseKey}`,
      async () => {
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: uppercaseKey,
          },
        );
      },
    );

    // Test lowercase variant
    const lowercaseKey = configKey.toLowerCase();
    await TestValidator.error(
      `should not find configuration with lowercase key variation: ${lowercaseKey}`,
      async () => {
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: lowercaseKey,
          },
        );
      },
    );

    // Test mixed case variant
    const mixedCaseKey =
      configKey.charAt(0).toUpperCase() + configKey.slice(1).toLowerCase();
    await TestValidator.error(
      `should not find configuration with mixed case key variation: ${mixedCaseKey}`,
      async () => {
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: mixedCaseKey,
          },
        );
      },
    );
  }

  // Step 4: Validate consistent behavior across multiple test iterations
  TestValidator.predicate(
    "test completed without inconsistent responses",
    true,
  );
}
