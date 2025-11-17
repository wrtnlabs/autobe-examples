import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

/**
 * Test updating an existing system configuration setting by an admin user.
 *
 * This test simulates the complete flow for an admin user to update a system
 * configuration. It performs the following steps:
 *
 * 1. Register and authenticate as an admin user (POST /auth/admin/join)
 * 2. Create a system configuration setting for testing update scenario (POST
 *    /redditCommunity/admin/redditCommunitySystemConfigurations)
 * 3. Update the configuration value and description via PUT endpoint (PUT
 *    /redditCommunity/admin/redditCommunitySystemConfigurations/{name})
 * 4. Assert that the updated configuration reflects the changes
 * 5. Confirm that admin authentication token is used for privileged calls
 *
 * The test ensures proper role-based access control and validates data
 * integrity according to the provided DTO structures.
 */
export async function test_api_reddit_community_system_configurations_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://localhost/auth/admin/join",
        referrer: "https://localhost/",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a system configuration for update
  const createBody: IRedditCommunitySystemConfiguration.ICreate = {
    name: `test_config_${RandomGenerator.alphaNumeric(6)}`,
    value: "initial_value",
    description: "Initial test configuration description",
  };
  const createdConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created configuration name equals input",
    createdConfig.name,
    createBody.name,
  );
  TestValidator.equals(
    "created configuration value equals input",
    createdConfig.value,
    createBody.value,
  );
  TestValidator.equals(
    "created configuration description equals input",
    createdConfig.description,
    createBody.description,
  );

  // Step 3: Update the configuration value and description
  const updateBody: IRedditCommunitySystemConfiguration.IUpdate = {
    value: "updated_value",
    description: "Updated test configuration description",
  };
  const updatedConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.update(
      connection,
      {
        name: createdConfig.name,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);

  // Step 4: Assert updated configuration reflects changes
  TestValidator.equals(
    "updated configuration name matches",
    updatedConfig.name,
    createdConfig.name,
  );
  TestValidator.equals(
    "updated configuration value matches",
    updatedConfig.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated configuration description matches",
    updatedConfig.description,
    updateBody.description,
  );

  // Step 5: Confirm timestamps have been updated logically
  // Dates are ISO 8601 strings; verify updated_at > created_at
  const createdAt = new Date(createdConfig.created_at);
  const updatedAt = new Date(updatedConfig.updated_at);
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // The test ensures admin token was accepted and used (implicit token management)
}
