import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_configurations_create } from "../../../generate/generate_random_discussion_board_admin_system_configurations_create";
import { prepare_random_discussion_board_system_configuration } from "../../../prepare/prepare_random_discussion_board_system_configuration";

export async function test_api_system_configuration_update_with_valid_values(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create initial configuration with string type
  const baseConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          config_key: RandomGenerator.alphaNumeric(10),
          config_value: RandomGenerator.content({ paragraphs: 1 }),
          data_type: "string" as const,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "general",
          is_sensitive: false,
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(baseConfig);
  // Prepare update data - maintaining consistent data type to avoid type error testing
  const updateData: IDiscussionBoardSystemConfiguration.IUpdate = {
    config_value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "authentication",
    is_sensitive: true,
  };
  // Perform the update operation
  const updatedConfig =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configurationId: baseConfig.id,
        body: updateData,
      },
    );
  typia.assert(updatedConfig);
  // Validate that config_key remains unchanged
  TestValidator.equals(
    "config_key should remain unchanged",
    updatedConfig.config_key,
    baseConfig.config_key,
  );
  // Validate that modifiable fields are updated
  TestValidator.equals(
    "config_value should be updated",
    updatedConfig.config_value,
    updateData.config_value,
  );
  TestValidator.equals(
    "description should be updated",
    updatedConfig.description,
    updateData.description,
  );
  TestValidator.equals(
    "category should be updated",
    updatedConfig.category,
    updateData.category,
  );
  TestValidator.equals(
    "is_sensitive should be updated",
    updatedConfig.is_sensitive,
    updateData.is_sensitive,
  );
  // Validate that created_at remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedConfig.created_at,
    baseConfig.created_at,
  );
  // Validate that updated_at is refreshed
  TestValidator.notEquals(
    "updated_at should be different",
    updatedConfig.updated_at,
    baseConfig.updated_at,
  );
  // Validate that ID remains the same
  TestValidator.equals(
    "ID should remain the same",
    updatedConfig.id,
    baseConfig.id,
  );
  // Validate that the configuration object is complete
  TestValidator.predicate(
    "configuration should have valid ID",
    updatedConfig.id.length > 0,
  );
  TestValidator.predicate(
    "configuration should have valid config_key",
    updatedConfig.config_key.length > 0,
  );
  TestValidator.predicate(
    "configuration should have valid config_value",
    updatedConfig.config_value.length > 0,
  );
  TestValidator.predicate(
    "configuration should have valid description",
    updatedConfig.description.length > 0,
  );
  TestValidator.predicate(
    "configuration should have valid category",
    updatedConfig.category.length > 0,
  );
}
