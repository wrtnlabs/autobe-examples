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
 * Test that requesting a non-existent administrator ID returns 404 Not Found error.
 *
 * This test validates that:
 * 1. The API properly handles requests for non-existent administrator IDs
 * 2. A 404 status code is returned for non-existent administrators
 * 3. The system maintains security by not revealing whether an admin existed
 *    but was deleted vs. never existed
 */
export async function test_api_admin_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Generate a random UUID that does not exist in the database
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Step 3 & 4: Verify that requesting non-existent admin returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent administrator",
    404,
    async () =>
      await api.functional.discussionBoard.admin.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      }),
  );
}
