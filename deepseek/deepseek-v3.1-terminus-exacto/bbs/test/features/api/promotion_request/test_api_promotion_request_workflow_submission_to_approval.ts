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

export async function test_api_promotion_request_workflow_submission_to_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Submit promotion request as regular user
  const reason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 10,
    wordMax: 15,
  });
  TestValidator.predicate(
    "reason should meet length requirements",
    reason.length >= 50 && reason.length <= 500,
  );
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: reason satisfies string &
            tags.MinLength<50> &
            tags.MaxLength<500>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request status should be pending",
    promotionRequest.status,
    "pending",
  );
  // Step 3: Create and authenticate superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 4: Create workflow transitions - pending to under_review
  const underReviewWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "under_review",
          notes: "Promotion request is now under review by super administrator",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(underReviewWorkflow);
  TestValidator.equals(
    "workflow status should be under_review",
    underReviewWorkflow.status,
    "under_review",
  );
  TestValidator.equals(
    "workflow notes should match",
    underReviewWorkflow.notes,
    "Promotion request is now under review by super administrator",
  );
  // Step 5: Create workflow transitions - under_review to approved
  const approvedWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
          notes:
            "Promotion request approved, user granted administrator privileges",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(approvedWorkflow);
  TestValidator.equals(
    "workflow status should be approved",
    approvedWorkflow.status,
    "approved",
  );
  TestValidator.equals(
    "workflow notes should match",
    approvedWorkflow.notes,
    "Promotion request approved, user granted administrator privileges",
  );
  // Step 6: Validate workflow progression and relationships
  TestValidator.equals(
    "promotion request ID should match in workflow",
    approvedWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "user ID should match in workflow",
    approvedWorkflow.promotionRequest.user.id,
    user.id,
  );
  TestValidator.predicate(
    "workflow should have creation timestamp",
    approvedWorkflow.created_at !== null,
  );
  TestValidator.notEquals(
    "different workflow instances should have different IDs",
    underReviewWorkflow.id,
    approvedWorkflow.id,
  );
}
