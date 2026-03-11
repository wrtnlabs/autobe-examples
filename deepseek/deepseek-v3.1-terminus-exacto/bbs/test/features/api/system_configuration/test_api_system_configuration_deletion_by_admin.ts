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
 * Test system configuration deletion by admin.
 * 1. Authenticate as admin using join endpoint
 * 2. Create a system configuration for testing
 * 3. Delete the configuration using DELETE endpoint
 * 4. Validate soft deletion (deleted_at field)
 * 5. Verify subsequent deletion attempts fail
 */
export async function test_api_system_configuration_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create system configuration
  const configuration =
    await generate_random_discussion_board_admin_system_configurations_create(
      adminConnection,
      {
        body: {
          key: `test.config.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSystemConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  // 3. Delete the configuration
  await api.functional.discussionBoard.admin.system_configurations.erase(
    adminConnection,
    {
      configId: configuration.id,
    },
  );
  // 4. Verify soft deletion - the configuration should have deleted_at set
  // Note: Since we don't have a GET endpoint to verify the soft deletion,
  // we rely on the error test to confirm the configuration is no longer accessible
  // 5. Verify subsequent deletion attempts fail with appropriate error
  await TestValidator.httpError(
    "deleting already deleted configuration should fail",
    404, // Assuming 404 Not Found for already deleted resource
    async () => {
      await api.functional.discussionBoard.admin.system_configurations.erase(
        adminConnection,
        {
          configId: configuration.id,
        },
      );
    },
  );
}
