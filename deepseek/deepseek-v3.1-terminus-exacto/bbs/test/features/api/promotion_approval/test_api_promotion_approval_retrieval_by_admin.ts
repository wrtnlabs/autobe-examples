import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

/**
 * Test the successful retrieval of a promotion approval record by an administrator.
 * This scenario validates that administrators can access detailed approval information
 * including the promotion request details, reviewer information, decision rationale,
 * and timestamps. The test creates a promotion request, has it approved by a super
 * administrator, and then verifies that a regular administrator can retrieve the
 * complete approval record with all relationships intact.
 */
export async function test_api_promotion_approval_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Step 2: Submit promotion request as user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Step 3: Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Step 4: Approve the promotion request as super admin
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved" as const,
          reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Step 5: Create and authenticate as regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 6: Retrieve the promotion approval record
  // The approval ID should be the same as the promotion request ID since it represents the approval record
  const approvalRecord =
    await api.functional.discussionBoard.admin.promotion_approvals.at(
      adminConnection,
      {
        approvalId: approvedRequest.id,
      },
    );
  typia.assert(approvalRecord);
  // Step 7: Validate the approval record contains all expected fields
  TestValidator.equals(
    "approval ID matches",
    approvalRecord.id,
    approvedRequest.id,
  );
  TestValidator.predicate("approval is active", approvalRecord.is_active);
  TestValidator.equals(
    "approval grade is regular",
    approvalRecord.grade,
    "regular",
  );
  TestValidator.predicate(
    "promotion timestamp exists",
    approvalRecord.promoted_at !== null,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    approvalRecord.created_at !== null,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    approvalRecord.updated_at !== null,
  );
  // Validate user information
  TestValidator.predicate(
    "user information exists",
    approvalRecord.user !== null,
  );
  TestValidator.equals("user ID matches", approvalRecord.user.id, userAuth.id);
  TestValidator.equals(
    "user display name matches",
    approvalRecord.user.display_name,
    userAuth.display_name,
  );
  // Validate admin information (should be null since this is a regular admin approval)
  TestValidator.equals(
    "admin information should be null for regular grade",
    approvalRecord.admin,
    null,
  );
  TestValidator.equals(
    "super admin information should be null for regular grade",
    approvalRecord.super_admin,
    null,
  );
  // Validate timestamps are in correct format
  TestValidator.predicate(
    "promoted_at is valid date",
    () => !isNaN(new Date(approvalRecord.promoted_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(new Date(approvalRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(new Date(approvalRecord.updated_at).getTime()),
  );
}
