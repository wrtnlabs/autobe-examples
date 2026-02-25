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

export async function test_api_system_configuration_update_sensitive_flag(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "super_admin_password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create initial non-sensitive configuration
  const initialConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: "test_sensitive_config",
          config_value: "initial_value",
          data_type: "string",
          description: "Test configuration for sensitivity flag updates",
          category: "security",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  TestValidator.equals(
    "initial sensitivity flag",
    initialConfig.is_sensitive,
    false,
  );
  // Update configuration to mark as sensitive
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          is_sensitive: true,
          config_value: "updated_sensitive_value",
          description: "Updated to sensitive configuration",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Validate sensitivity flag update
  TestValidator.equals(
    "configuration id unchanged",
    updatedConfig.id,
    initialConfig.id,
  );
  TestValidator.equals(
    "sensitivity flag updated",
    updatedConfig.is_sensitive,
    true,
  );
  TestValidator.notEquals(
    "config value changed",
    updatedConfig.config_value,
    initialConfig.config_value,
  );
  TestValidator.notEquals(
    "description changed",
    updatedConfig.description,
    initialConfig.description,
  );
  // Test data type validation with different data types
  const booleanConfigUpdate =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          data_type: "boolean",
          config_value: "true",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(booleanConfigUpdate);
  TestValidator.equals(
    "data type updated",
    booleanConfigUpdate.data_type,
    "boolean",
  );
  // Test integer data type
  const integerConfigUpdate =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          data_type: "integer",
          config_value: "42",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(integerConfigUpdate);
  TestValidator.equals(
    "integer data type",
    integerConfigUpdate.data_type,
    "integer",
  );
  // Final validation of sensitive configuration properties
  TestValidator.predicate(
    "configuration remains sensitive",
    integerConfigUpdate.is_sensitive,
  );
}
