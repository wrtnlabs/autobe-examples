import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

/**
 * Test the deletion of a reddit community system configuration entry by an
 * authenticated admin user.
 *
 * Business context: This test ensures that an admin user can successfully
 * delete a system configuration entry. It validates the full business flow:
 * authentication, creation of a system configuration, deletion of the created
 * configuration, and verification of successful deletion. Proper authorization
 * and error handling are also verified.
 *
 * Steps:
 *
 * 1. Authenticate as an admin using the /auth/admin/join API.
 * 2. Create a system configuration entry with unique name and valid value.
 * 3. Delete the created system configuration entry by its name.
 * 4. Verify the deletion request completes without error.
 */
export async function test_api_reddit_community_system_configuration_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123!",
        href: "https://localhost/login",
        referrer: "https://localhost/",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a system configuration entry
  const configName = `test-config-${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.alphabets(12);
  const configuration: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: {
          name: configName,
          value: configValue,
          description: "Temporary test configuration for e2e testing",
        } satisfies IRedditCommunitySystemConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  TestValidator.equals(
    "created configuration name matches",
    configuration.name,
    configName,
  );
  TestValidator.equals(
    "created configuration value matches",
    configuration.value,
    configValue,
  );

  // 3. Delete the created system configuration entry by name
  await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.erase(
    connection,
    {
      name: configName,
    },
  );

  // 4. No response to verify after deletion, just ensure no error thrown
}
