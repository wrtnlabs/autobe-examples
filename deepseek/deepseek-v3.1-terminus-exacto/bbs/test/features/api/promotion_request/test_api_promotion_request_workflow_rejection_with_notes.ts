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

export async function test_api_promotion_request_workflow_rejection_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create promotion request as user
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create workflow transition: pending → under_review
  const underReviewWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "under_review",
          notes: "Promotion request moved to under review for evaluation",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(underReviewWorkflow);
  // Create workflow transition: under_review → rejected with detailed notes
  const rejectionNotes =
    "Application rejected due to insufficient community contributions. Applicant has not met the minimum article and comment requirements.";
  const rejectedWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          notes: rejectionNotes,
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(rejectedWorkflow);
  // Verify workflow audit trail
  TestValidator.equals(
    "workflow status progression",
    rejectedWorkflow.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection notes preserved",
    rejectedWorkflow.notes,
    rejectionNotes,
  );
  // Additional validation: Verify the parent promotion request reflects rejection
  // Note: Since we don't have a GET endpoint for promotion requests, we validate through workflow association
  TestValidator.equals(
    "workflow linked to correct promotion request",
    rejectedWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "promotion request status in workflow summary",
    rejectedWorkflow.promotionRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "workflow created timestamp should be valid",
    new Date(rejectedWorkflow.created_at) instanceof Date &&
      !isNaN(new Date(rejectedWorkflow.created_at).getTime()),
  );
}
