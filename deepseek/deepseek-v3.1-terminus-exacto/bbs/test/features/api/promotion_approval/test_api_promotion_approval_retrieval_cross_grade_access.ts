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

export async function test_api_promotion_approval_retrieval_cross_grade_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular user who will submit the promotion request
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create a super administrator who will approve the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Submit a promotion request as the regular user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Approve the promotion request as the super administrator to create an approval record
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved" as const,
          reviewer_notes: "Approved for cross-grade access testing",
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Verify the super administrator can retrieve the approval record using the admin endpoint
  const approvalRecord =
    await api.functional.discussionBoard.admin.promotion_approvals.at(
      superAdminConnection,
      {
        approvalId: approvedRequest.id,
      },
    );
  typia.assert(approvalRecord);
  // Validate the retrieved approval record matches the created one
  TestValidator.equals(
    "approval record ID matches",
    approvalRecord.id,
    approvedRequest.id,
  );
  // Remove the invalid status check since IDiscussionBoardAdministratorPromotionApproval doesn't have status property
  // Instead, validate other properties that exist on the approval record
  TestValidator.predicate(
    "approval record has user information",
    approvalRecord.user !== null && approvalRecord.user.id !== undefined,
  );
  // Additional validation to ensure cross-grade access works correctly
  TestValidator.predicate(
    "super admin can access admin endpoint",
    approvalRecord !== null,
  );
}