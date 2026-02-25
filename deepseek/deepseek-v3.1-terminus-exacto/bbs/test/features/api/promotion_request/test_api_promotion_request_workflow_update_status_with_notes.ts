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

export async function test_api_promotion_request_workflow_update_status_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits promotion request
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 15,
          }).slice(0, 200),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Create initial workflow record
  const initialWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.create(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "pending",
          notes: null,
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(initialWorkflow);
  // Update workflow status and add notes
  const updatedWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.putByRequestidAndWorkflowid(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        workflowId: initialWorkflow.id,
        body: {
          status: "under_review",
          notes:
            "This promotion request is currently under review by the super administrator team.",
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate,
      },
    );
  typia.assert(updatedWorkflow);
  // Validate updates while preserving created_at
  TestValidator.equals(
    "workflow id remains unchanged",
    updatedWorkflow.id,
    initialWorkflow.id,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedWorkflow.created_at,
    initialWorkflow.created_at,
  );
  TestValidator.notEquals(
    "status should be updated",
    updatedWorkflow.status,
    initialWorkflow.status,
  );
  TestValidator.notEquals(
    "notes should be updated",
    updatedWorkflow.notes,
    initialWorkflow.notes,
  );
  TestValidator.equals(
    "promotion request reference remains correct",
    updatedWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
  TestValidator.equals(
    "status should be under_review",
    updatedWorkflow.status,
    "under_review",
  );
  TestValidator.predicate(
    "notes should contain review information",
    updatedWorkflow.notes !== null && updatedWorkflow.notes.length > 0,
  );
}
