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
 * Test the successful retrieval of a specific promotion approval record by a super administrator.
 *
 * This test verifies that a super administrator can authenticate and retrieve
 * a complete promotion approval record with all its relationships and timestamp
 * information properly populated.
 */
export async function test_api_promotion_approval_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Retrieve a specific promotion approval record
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  const approval =
    await api.functional.discussionBoard.superAdmin.promotion_approvals.at(
      superAdminConnection,
      { approvalId },
    );
  typia.assert(approval);
  // Validate the approval record structure
  TestValidator.equals("approval ID matches", approval.id, approvalId);
  // Validate admin/super_admin relationships based on grade
  if (approval.grade === "regular") {
    TestValidator.predicate(
      "admin exists for regular grade",
      approval.admin !== null,
    );
    TestValidator.predicate(
      "super_admin is null for regular grade",
      approval.super_admin === null,
    );
  } else {
    TestValidator.predicate(
      "super_admin exists for super grade",
      approval.super_admin !== null,
    );
    TestValidator.predicate(
      "admin is null for super grade",
      approval.admin === null,
    );
  }
  // Validate that user relationship exists
  TestValidator.predicate(
    "user relationship exists",
    approval.user !== undefined,
  );
}
