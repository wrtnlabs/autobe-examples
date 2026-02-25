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
 * Test partial updates to system configuration where only specific fields are modified.
 * 1. Create initial configuration with complete field set
 * 2. Authenticate as super administrator
 * 3. Update only config_value and description fields while keeping other fields unchanged
 * 4. Verify that unspecified fields retain their original values
 * 5. Test that the update operation properly handles partial update requests
 */
export async function test_api_system_configuration_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create initial super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin1234",
    },
  });
  // Create initial system configuration with complete field set
  const initialConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          config_key: RandomGenerator.paragraph({ sentences: 2 }),
          config_value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "general",
          is_sensitive: false,
        },
      },
    );
  typia.assert(initialConfig);
  // Perform partial update - only config_value and description
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configurationId: initialConfig.id,
        body: {
          config_value: "Updated config value",
          description: "Updated description",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Verify that unchanged fields retain their original values
  TestValidator.equals(
    "config_key unchanged",
    updatedConfig.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "data_type unchanged",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "category unchanged",
    updatedConfig.category,
    initialConfig.category,
  );
  TestValidator.equals(
    "is_sensitive unchanged",
    updatedConfig.is_sensitive,
    initialConfig.is_sensitive,
  );
  // Verify that specified fields were updated
  TestValidator.equals(
    "config_value updated",
    updatedConfig.config_value,
    "Updated config value",
  );
  TestValidator.equals(
    "description updated",
    updatedConfig.description,
    "Updated description",
  );
  // Verify that timestamps are updated appropriately
  TestValidator.notEquals(
    "updated_at changed",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedConfig.created_at,
    initialConfig.created_at,
  );
}
