import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

// Test permanent deletion of a redditCommunity system configuration by an admin
// Authenticate as admin user
// Create a system configuration with random but valid values for config_key and config_value
// Delete the created configuration by its ID
// Assert no errors occur and API calls succeed
// Confirm that the deleted configuration is no longer retrievable (implicit by successful delete call and no errors)
// Use typia.assert for all API responses
// Properly await all async API calls
// Follow API SDK function usage exactly
// Use the provided DTO types
export async function test_api_reddit_community_system_configuration_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate and obtain authorization
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Create a system configuration entry to be deleted later
  const createBody = {
    config_key: RandomGenerator.alphaNumeric(12),
    config_value: RandomGenerator.alphaNumeric(24),
    description: null,
  } satisfies IRedditCommunitySystemConfiguration.ICreate;
  const createdConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Delete the created configuration by ID
  await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.erase(
    connection,
    {
      id: createdConfig.id,
    },
  );
}
