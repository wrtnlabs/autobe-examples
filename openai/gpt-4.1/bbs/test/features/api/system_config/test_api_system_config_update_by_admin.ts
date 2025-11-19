import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Verify updating system configuration entries by an authenticated admin.
 *
 * 1. Register and authenticate as an admin (unique email, strong password)
 * 2. Create a new configuration entry (unique config_key, value, description)
 * 3. Update only the value (and optionally description) of the same config using
 *    PUT
 * 4. Assert new value/description are updated, config_key/id/created_at not
 *    changed
 * 5. Confirm updated_at timestamp advances
 * 6. Business logic: config_key uniqueness, update only allowed for existing key
 */
export async function test_api_system_config_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        href: "https://autobe-e2e.test/admin-join",
        referrer: "https://autobe-e2e.test/auth",
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Create initial system config entry
  const configKey = `test_${RandomGenerator.alphaNumeric(10)}`;
  const initialConfigValue = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdConfig: IDiscussionBoardSystemConfig =
    await api.functional.discussionBoard.admin.systemConfigs.create(
      connection,
      {
        body: {
          config_key: configKey,
          config_value: initialConfigValue,
          description: initialDescription,
        } satisfies IDiscussionBoardSystemConfig.ICreate,
      },
    );
  typia.assert(createdConfig);

  // 3. Update the config's value and description
  const updatedConfigValue = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedConfig: IDiscussionBoardSystemConfig =
    await api.functional.discussionBoard.admin.systemConfigs.update(
      connection,
      {
        configKey: configKey,
        body: {
          config_value: updatedConfigValue,
          description: updatedDescription,
        } satisfies IDiscussionBoardSystemConfig.IUpdate,
      },
    );
  typia.assert(updatedConfig);

  // 4. Validate response reflects updates and metadata changes
  TestValidator.equals(
    "config_key remains unchanged",
    updatedConfig.config_key,
    createdConfig.config_key,
  );
  TestValidator.equals(
    "id remains unchanged",
    updatedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.notEquals(
    "updated_at advances",
    updatedConfig.updated_at,
    createdConfig.updated_at,
  );
  TestValidator.equals(
    "config_value properly updated",
    updatedConfig.config_value,
    updatedConfigValue,
  );
  TestValidator.equals(
    "description properly updated",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedConfig.deleted_at,
    createdConfig.deleted_at,
  );
}
