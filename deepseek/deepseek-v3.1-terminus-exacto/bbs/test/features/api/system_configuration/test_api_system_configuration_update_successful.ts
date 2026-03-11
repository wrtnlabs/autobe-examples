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

/**
 * Test successful update of an existing system configuration by an administrator.
 * Create a system configuration first, then update its value and description fields.
 * Verify that the immutable fields (key and data_type) remain unchanged while the
 * updated_at timestamp is automatically refreshed. Validate that the response contains
 * the complete updated configuration object with all fields including timestamps.
 */
export async function test_api_system_configuration_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial system configuration with realistic data
  const initialConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          key: `app.feature.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // 3. Update the configuration with new values
  const updateBody = {
    value: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSystemConfiguration.IUpdate;
  const updatedConfig =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configId: initialConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // 4. Validate immutable fields remain unchanged
  TestValidator.equals(
    "key should remain unchanged",
    updatedConfig.key,
    initialConfig.key,
  );
  TestValidator.equals(
    "data_type should remain unchanged",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedConfig.created_at,
    initialConfig.created_at,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedConfig.id,
    initialConfig.id,
  );
  // 5. Validate updated fields
  TestValidator.equals(
    "value should be updated",
    updatedConfig.value,
    updateBody.value,
  );
  TestValidator.equals(
    "description should be updated",
    updatedConfig.description,
    updateBody.description,
  );
  // 6. Validate updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(updatedConfig.updated_at).getTime()),
  );
  // 7. Validate complete configuration object structure
  TestValidator.predicate(
    "should have valid UUID id",
    /^[0-9a-f-]{36}$/i.test(updatedConfig.id),
  );
  TestValidator.predicate(
    "should have valid created_at timestamp",
    !isNaN(new Date(updatedConfig.created_at).getTime()),
  );
  TestValidator.predicate(
    "should have valid updated_at timestamp",
    !isNaN(new Date(updatedConfig.updated_at).getTime()),
  );
}
