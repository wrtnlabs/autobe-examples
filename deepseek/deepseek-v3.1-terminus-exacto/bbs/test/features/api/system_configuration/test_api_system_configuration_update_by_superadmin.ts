import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test the primary success path for super administrators updating system configuration values.
 * 1. Authenticate as super administrator
 * 2. Create initial system configuration
 * 3. Update configuration with new values
 * 4. Validate response and immutability of key/data_type fields
 */
export async function test_api_system_configuration_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial system configuration
  const initialConfig =
    await generate_random_discussion_board_super_admin_system_configurations_create(
      superAdminConnection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: "initial value",
          data_type: "string",
          description: "Original configuration",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // 3. Update configuration with new values
  const updatedConfig =
    await api.functional.discussionBoard.superAdmin.system_configurations.update(
      superAdminConnection,
      {
        configId: initialConfig.id,
        body: {
          value: "updated value",
          description: "Updated configuration description",
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate response
  TestValidator.equals(
    "configuration ID remains same",
    updatedConfig.id,
    initialConfig.id,
  );
  TestValidator.equals(
    "key field remains immutable",
    updatedConfig.key,
    initialConfig.key,
  );
  TestValidator.equals(
    "data_type field remains immutable",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "value field updated correctly",
    updatedConfig.value,
    "updated value",
  );
  TestValidator.equals(
    "description field updated correctly",
    updatedConfig.description,
    "Updated configuration description",
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedConfig.updated_at) > new Date(initialConfig.created_at),
  );
}
