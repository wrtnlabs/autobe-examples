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
 * Test that the system properly rejects duplicate configuration keys to maintain uniqueness constraint.
 * Attempt to create configurations with identical keys and verify the system returns appropriate error responses.
 *
 * Steps:
 * 1. Authenticate as admin
 * 2. Create configuration with key 'system.feature.enabled'
 * 3. Attempt to create another configuration with same key 'system.feature.enabled'
 * 4. Verify second attempt fails with appropriate error message
 * 5. Create configuration with different key to confirm system still works
 */
export async function test_api_system_configuration_create_duplicate_key_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using SDK function (no utility function available)
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create first configuration with specific key
  const firstConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "system.feature.enabled",
          value: "true",
          data_type: "boolean",
          description: "Test configuration for feature flag",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  // Attempt to create duplicate configuration - should fail
  await TestValidator.error("duplicate key rejection", async () => {
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "system.feature.enabled",
          value: "false",
          data_type: "boolean",
          description: "Duplicate configuration with same key",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  });
  // Create configuration with different key to confirm system still works
  const thirdConfig =
    await api.functional.discussionBoard.admin.system_configurations.create(
      adminConnection,
      {
        body: {
          key: "system.another.feature",
          value: "enabled",
          data_type: "string",
          description:
            "Different configuration key to verify system functionality",
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(thirdConfig);
  // Validate that the third configuration was created successfully
  TestValidator.notEquals("different keys", firstConfig.key, thirdConfig.key);
}
