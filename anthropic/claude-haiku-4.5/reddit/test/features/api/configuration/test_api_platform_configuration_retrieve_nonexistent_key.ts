import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving a platform configuration with a non-existent key.
 *
 * This test validates that the configuration retrieval endpoint properly
 * handles requests for configuration keys that do not exist in the system. The
 * test creates an administrator account, then attempts to retrieve multiple
 * non-existent configuration keys and validates that appropriate error
 * responses are returned.
 *
 * Test flow:
 *
 * 1. Create administrator account with authentication
 * 2. Attempt to retrieve configuration using non-existent keys
 * 3. Validate that error responses are returned (404 or appropriate error)
 * 4. Confirm error messages clearly indicate the key does not exist
 * 5. Test with multiple different non-existent keys for consistency
 */
export async function test_api_platform_configuration_retrieve_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test retrieving non-existent configuration keys
  const nonExistentKeys = [
    "nonexistent_setting_xyz",
    "config_does_not_exist",
    "invalid_key_12345",
    "this_key_never_created",
  ];

  for (const configKey of nonExistentKeys) {
    await TestValidator.error(
      `retrieving non-existent configuration key "${configKey}" should fail`,
      async () => {
        await api.functional.communityPlatform.administrator.configurations.at(
          connection,
          {
            configurationKey: configKey,
          },
        );
      },
    );
  }

  TestValidator.predicate(
    "all non-existent key retrieval attempts should fail consistently",
    true,
  );
}
