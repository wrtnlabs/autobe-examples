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

/**
 * Test update operation with a non-existent configuration ID.
 * Attempt to update a system configuration using an invalid UUID that does not
 * correspond to any existing configuration. Verify that the system returns an
 * appropriate error response indicating the configuration was not found.
 * This validates proper error handling for invalid resource references.
 */
export async function test_api_system_configuration_update_nonexistent(
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
  // Generate a non-existent configuration ID
  const nonExistentConfigId = typia.random<string & tags.Format<"uuid">>();
  // Create valid update data
  const updateData =
    typia.random<IDiscussionBoardSystemConfiguration.IUpdate>();
  // Attempt to update non-existent configuration and verify error
  await TestValidator.error(
    "update non-existent configuration should fail",
    async () => {
      await api.functional.discussionBoard.admin.system_configurations.update(
        adminConnection,
        {
          configId: nonExistentConfigId,
          body: updateData,
        },
      );
    },
  );
}
