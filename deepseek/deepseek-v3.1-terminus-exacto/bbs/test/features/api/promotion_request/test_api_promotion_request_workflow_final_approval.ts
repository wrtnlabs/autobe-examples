import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_promotion_requests_workflows_create } from "../../../generate/generate_random_discussion_board_super_admin_promotion_requests_workflows_create";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";
import { prepare_random_discussion_board_administrator_promotion_request_workflow } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request_workflow";

export async function test_api_promotion_request_workflow_final_approval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Create regular user account
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Submit promotion request from user using utility function
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Create superAdmin account for approval authority
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 4. Create initial workflow with 'under_review' status using utility function
  const initialWorkflow =
    await generate_random_discussion_board_super_admin_promotion_requests_workflows_create(
      superAdminConnection,
      {
        params: { requestId: promotionRequest.id },
        body: {
          status: "under_review",
          notes: "Under review by super administrator",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(initialWorkflow);
  // 5. Perform final approval decision
  const approvalNotes =
    "Application approved after thorough review. User meets all requirements.";
  const finalWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.patchByRequestid(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
          notes: approvalNotes,
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate,
      },
    );
  typia.assert(finalWorkflow);
  // 6. Validate final approval workflow
  TestValidator.equals(
    "workflow status should be approved",
    finalWorkflow.status,
    "approved",
  );
  TestValidator.equals(
    "workflow notes should match approval notes",
    finalWorkflow.notes,
    approvalNotes,
  );
  // 7. Validate promotion request reflects approval
  TestValidator.equals(
    "promotion request ID should match",
    finalWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "promotion request status should be approved",
    finalWorkflow.promotionRequest.status,
    "approved",
  );
  TestValidator.equals(
    "original user should match",
    finalWorkflow.promotionRequest.user.id,
    user.id,
  );
  // 8. Verify workflow audit trail (typia.assert already validated structure)
  TestValidator.predicate(
    "promotion request reason should be preserved",
    finalWorkflow.promotionRequest.reason.length >= 50,
  );
  TestValidator.notEquals(
    "workflow record should be different from initial",
    finalWorkflow.id,
    initialWorkflow.id,
  );
  TestValidator.equals(
    "user display name consistency",
    finalWorkflow.promotionRequest.user.display_name,
    user.display_name,
  );
}
