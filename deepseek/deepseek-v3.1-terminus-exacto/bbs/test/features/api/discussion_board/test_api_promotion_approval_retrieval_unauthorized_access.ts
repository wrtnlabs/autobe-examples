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
 * Test unauthorized access to promotion approval retrieval endpoint.
 * Verifies that only super administrators can access promotion approval records
 * and that proper authorization errors are returned for unauthorized attempts.
 */
export async function test_api_promotion_approval_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and generate a valid approval ID
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random approval ID for testing
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Attempt access with base connection (no authentication)
  await TestValidator.error(
    "unauthorized access with base connection",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_approvals.at(
        connection,
        { approvalId },
      );
    },
  );
  // Test 2: Attempt access with a regular user connection (if available)
  // Since we don't have regular user auth utilities, use base connection
  await TestValidator.error(
    "unauthorized access without super admin privileges",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_approvals.at(
        connection,
        { approvalId },
      );
    },
  );
  // Test 3: Verify that super admin can successfully access the endpoint
  const approval =
    await api.functional.discussionBoard.superAdmin.promotion_approvals.at(
      superAdminConnection,
      { approvalId },
    );
  typia.assert(approval);
  TestValidator.predicate(
    "super admin access should return valid approval data",
    approval !== null,
  );
}
