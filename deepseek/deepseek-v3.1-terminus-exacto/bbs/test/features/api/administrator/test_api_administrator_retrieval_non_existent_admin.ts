import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test handling of non-existent administrator ID.
 * Authenticate as superAdmin and attempt to retrieve details for an administrator ID
 * that does not exist in the system. Verify that the operation returns an appropriate
 * error response indicating the administrator was not found.
 */
export async function test_api_administrator_retrieval_non_existent_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin-specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as superAdmin using SDK function (utility function not available in imports)
  const authResponse =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(authResponse);
  // Generate a random UUID that does not exist in the system
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent administrator and verify error
  await TestValidator.error("retrieve non-existent administrator", async () => {
    await api.functional.discussionBoard.superAdmin.administrators.at(
      superAdminConnection,
      {
        administratorId: nonExistentAdminId,
      },
    );
  });
}
