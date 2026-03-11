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
 * Test that immutable fields (key and data_type) cannot be modified through update operations.
 * Create a system configuration, then perform valid updates while verifying that immutable
 * fields remain unchanged. This validates the business rule that configuration identifiers
 * and types remain constant once created.
 */
export async function test_api_system_configuration_update_immutable_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial system configuration
  const initialConfig =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphabets(5),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);
  // Perform valid update of mutable fields only
  const updatedConfig =
    await api.functional.discussionBoard.admin.system_configurations.update(
      adminConnection,
      {
        configId: initialConfig.id,
        body: {
          value: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSystemConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Validate that immutable fields remain unchanged
  TestValidator.equals(
    "key field should remain immutable",
    updatedConfig.key,
    initialConfig.key,
  );
  TestValidator.equals(
    "data_type field should remain immutable",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  // Validate that mutable fields were successfully updated
  TestValidator.notEquals(
    "value field should be updated",
    updatedConfig.value,
    initialConfig.value,
  );
  TestValidator.notEquals(
    "description field should be updated",
    updatedConfig.description,
    initialConfig.description,
  );
}
