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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the error handling when attempting to retrieve a non-existent promotion approval record.
 * This scenario validates that the system properly handles invalid approval IDs by returning
 * appropriate error responses. The test authenticates an administrator and attempts to
 * retrieve an approval record using a UUID that does not exist in the system, verifying
 * that the operation returns a 404 Not Found error.
 */
export async function test_api_promotion_approval_retrieval_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Generate a random UUID that doesn't exist in the system
  const nonExistentApprovalId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent promotion approval record and verify 404 error
  await TestValidator.httpError(
    "retrieve non-existent approval",
    404,
    async () => {
      await api.functional.discussionBoard.admin.promotion_approvals.at(
        adminConnection,
        {
          approvalId: nonExistentApprovalId,
        },
      );
    },
  );
}
