import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_super_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

/**
 * Test updating system configuration settings by authorized super administrator.
 * 1. Create initial system configuration via prerequisite endpoint
 * 2. Authenticate as super administrator using join operation
 * 3. Update configuration value, data type, description, category, and sensitivity flag
 * 4. Validate that only modifiable fields are updated while config_key remains immutable
 * 5. Verify response contains complete configuration object with updated timestamp
 */
export async function test_api_system_configuration_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial system configuration
  const initialConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.alphabets(10),
          config_value: "initial_value",
          data_type: "string",
          description: "Initial configuration description",
          category: "general",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // Update configuration with new values
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          config_value: "123",
          data_type: "integer",
          description: "Updated configuration description",
          category: "security",
          is_sensitive: true,
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Validate that immutable config_key remains the same
  TestValidator.equals(
    "config_key should remain immutable",
    updatedConfig.config_key,
    initialConfig.config_key,
  );
  // Validate that modifiable fields are updated
  TestValidator.notEquals(
    "config_value should be updated",
    updatedConfig.config_value,
    initialConfig.config_value,
  );
  TestValidator.notEquals(
    "data_type should be updated",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedConfig.description,
    initialConfig.description,
  );
  TestValidator.notEquals(
    "category should be updated",
    updatedConfig.category,
    initialConfig.category,
  );
  TestValidator.notEquals(
    "is_sensitive should be updated",
    updatedConfig.is_sensitive,
    initialConfig.is_sensitive,
  );
  // Validate data type conversion works correctly
  TestValidator.equals(
    "config_value should be valid integer string",
    updatedConfig.config_value,
    "123",
  );
  TestValidator.equals(
    "data_type should be integer",
    updatedConfig.data_type,
    "integer",
  );
  // Validate updated timestamp is newer
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedConfig.updated_at) > new Date(initialConfig.created_at),
  );
  // Validate that created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedConfig.created_at,
    initialConfig.created_at,
  );
}
