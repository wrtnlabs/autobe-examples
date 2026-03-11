import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test business error scenario where admin attempts to delete a system configuration that does not exist.
 * 1. Authenticate as admin using authorize_admin_join utility function
 * 2. Generate a random UUID that doesn't correspond to any existing configuration
 * 3. Attempt to delete the non-existent configuration
 * 4. Validate that the system rejects the request with appropriate business error
 */
export async function test_api_system_configuration_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate non-existent configuration UUID
  const nonExistentConfigId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent configuration and validate error
  await TestValidator.error("delete non-existent configuration", async () => {
    await api.functional.discussionBoard.admin.system_configurations.erase(
      adminConnection,
      {
        configId: nonExistentConfigId,
      },
    );
  });
}
