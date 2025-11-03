import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Validate updating an existing redditCommunity system configuration by an
 * authorized admin.
 *
 * Test Steps:
 *
 * 1. Admin joins the system to create an admin account (with valid user_id).
 * 2. Admin logs in with valid credentials to obtain authorization tokens.
 * 3. Admin creates a new system configuration item with a unique config_key.
 * 4. Admin updates the created system configuration's config_value and
 *    description.
 * 5. Validate that the updated system configuration preserves id and config_key,
 *    config_value and description are updated, and updated_at timestamp is
 *    later than created_at.
 * 6. Try to update another system configuration with an existing config_key to
 *    ensure uniqueness enforcement causes an error.
 * 7. Attempt update with invalid ID and expect error.
 *
 * The test leverages correct DTO types and API function calls, ensuring no
 * unauthorized access or token handling leak.
 */
export async function test_api_redditcommunity_system_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginBody: IRedditCommunityAdmin.ILogin = {
    email: "admin@example.com",
    password: "admin-password",
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  };
  // We perform login via given API; if login requires actual registered account,
  // the test environment should make this email/password valid or simulate.
  const adminLoginAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a system configuration entry
  const systemConfigCreateBody: IRedditCommunitySystemConfiguration.ICreate = {
    config_key: `test_config_key_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "initial_value",
    description: "Initial test config description",
  };
  const systemConfigCreated: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      { body: systemConfigCreateBody },
    );
  typia.assert(systemConfigCreated);

  // 4. Update the created configuration
  // Update config_value and description, keep config_key same
  const updateBody: IRedditCommunitySystemConfiguration.IUpdate = {
    config_key: systemConfigCreated.config_key, // must keep unique key
    config_value: "updated_value",
    description: "Updated test config description",
  };
  const updatedConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.update(
      connection,
      { id: systemConfigCreated.id, body: updateBody },
    );
  typia.assert(updatedConfig);

  // Validate updatedConfig fields
  TestValidator.equals(
    "id remains same after update",
    updatedConfig.id,
    systemConfigCreated.id,
  );
  TestValidator.equals(
    "config_key remains same after update",
    updatedConfig.config_key,
    systemConfigCreated.config_key,
  );
  TestValidator.equals(
    "config_value updated correctly",
    updatedConfig.config_value,
    updateBody.config_value,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedConfig.description,
    updateBody.description,
  );

  // updated_at should be later than or equal to created_at
  TestValidator.predicate(
    "updated_at is later or equal to created_at",
    new Date(updatedConfig.updated_at).getTime() >=
      new Date(updatedConfig.created_at).getTime(),
  );

  // 5. Create another configuration to test updating with duplicate config_key
  const systemConfigCreateBody2: IRedditCommunitySystemConfiguration.ICreate = {
    config_key: `test_config_key_${RandomGenerator.alphaNumeric(10)}`,
    config_value: "initial_value_2",
    description: "Second test config",
  };
  const systemConfigCreated2: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      { body: systemConfigCreateBody2 },
    );
  typia.assert(systemConfigCreated2);

  // 6. Attempt to update systemConfigCreated2 with duplicate config_key of systemConfigCreated
  await TestValidator.error(
    "update with duplicate config_key should fail",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.update(
        connection,
        {
          id: systemConfigCreated2.id,
          body: {
            config_key: systemConfigCreated.config_key,
            config_value: "new_value",
            description: "Trying to duplicate config_key",
          },
        },
      );
    },
  );

  // 7. Attempt update with invalid UUID id
  await TestValidator.error("update with invalid id should fail", async () => {
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.update(
      connection,
      {
        id: "invalid-uuid-format",
        body: {
          config_key: `unique_key_${RandomGenerator.alphaNumeric(6)}`,
          config_value: "some_value",
          description: "Invalid ID test",
        },
      },
    );
  });
}
