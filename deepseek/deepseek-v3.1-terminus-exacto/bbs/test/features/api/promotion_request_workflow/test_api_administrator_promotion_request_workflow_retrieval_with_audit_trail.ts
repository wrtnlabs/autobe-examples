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

/**
 * Test super administrator retrieving a specific workflow audit trail for an administrator promotion request.
 *
 * This test validates the complete workflow audit trail retrieval process:
 * 1. Create a regular user who will request administrator promotion
 * 2. Create a super administrator to review the request
 * 3. User submits promotion request with detailed reasoning
 * 4. Super administrator creates workflow transitions for the request
 * 5. Super administrator retrieves the specific workflow record
 * 6. Validate audit trail completeness and accuracy
 * 7. Verify workflow belongs to correct promotion request
 */
export async function test_api_administrator_promotion_request_workflow_retrieval_with_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create super administrator connection and register
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // User creates promotion request using utility function
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // Super administrator creates workflow transitions using utility function
  const workflow =
    await generate_random_discussion_board_super_admin_promotion_requests_workflows_create(
      superAdminConnection,
      {
        body: {
          status: "under_review",
          notes: "Request is under initial review by super administrator",
        },
        params: {
          requestId: promotionRequest.id,
        },
      },
    );
  typia.assert(workflow);
  // Retrieve the specific workflow record with audit trail
  const retrievedWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        workflowId: workflow.id,
      },
    );
  typia.assert(retrievedWorkflow);
  // Validate audit trail completeness and accuracy
  TestValidator.equals(
    "workflow ID matches",
    retrievedWorkflow.id,
    workflow.id,
  );
  TestValidator.equals(
    "workflow status matches",
    retrievedWorkflow.status,
    "under_review",
  );
  TestValidator.equals(
    "workflow notes match",
    retrievedWorkflow.notes,
    "Request is under initial review by super administrator",
  );
  TestValidator.predicate(
    "workflow has valid creation timestamp",
    () => new Date(retrievedWorkflow.created_at).getTime() > 0,
  );
  // Validate workflow belongs to correct promotion request
  TestValidator.equals(
    "promotion request ID matches",
    retrievedWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "promotion request status matches",
    retrievedWorkflow.promotionRequest.status,
    promotionRequest.status,
  );
  TestValidator.equals(
    "promotion request reason matches",
    retrievedWorkflow.promotionRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.equals(
    "promotion request user matches",
    retrievedWorkflow.promotionRequest.user.id,
    user.id,
  );
  // Validate audit trail integrity
  TestValidator.predicate(
    "workflow created after promotion request",
    () =>
      new Date(retrievedWorkflow.created_at) >=
      new Date(promotionRequest.created_at),
  );
}
