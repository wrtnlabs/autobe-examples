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

export async function test_api_promotion_request_workflow_partial_update_notes_only(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User creates promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 15,
          }) satisfies string & tags.MinLength<50> & tags.MaxLength<500>,
        },
      },
    );
  typia.assert(promotionRequest);
  // Super admin creates initial workflow with 'approved' status
  const initialWorkflow =
    await generate_random_discussion_board_super_admin_promotion_requests_workflows_create(
      superAdminConnection,
      {
        params: { requestId: promotionRequest.id },
        body: {
          status: "approved",
          notes: "Initial approval notes" satisfies string | null as
            | string
            | null,
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate,
      },
    );
  typia.assert(initialWorkflow);
  // Save original timestamp for later comparison
  const originalCreatedAt = initialWorkflow.created_at;
  // Perform partial update - only notes field, intentionally omitting status
  const updatedNotes =
    "Additional review commentary and audit trail information";
  const updatedWorkflow =
    await api.functional.discussionBoard.superAdmin.promotion_requests.workflows.putByRequestidAndWorkflowid(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        workflowId: initialWorkflow.id,
        body: {
          notes: updatedNotes satisfies string | null as string | null,
        } satisfies IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate,
      },
    );
  typia.assert(updatedWorkflow);
  // Validate that status remains unchanged
  TestValidator.equals(
    "workflow status should remain approved",
    updatedWorkflow.status,
    "approved",
  );
  // Validate that notes field was updated
  TestValidator.equals(
    "notes field should be updated",
    updatedWorkflow.notes,
    updatedNotes,
  );
  // Validate that created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedWorkflow.created_at,
    originalCreatedAt,
  );
  // Validate that promotion request reference remains correct
  TestValidator.equals(
    "promotion request ID should remain correct",
    updatedWorkflow.promotionRequest.id,
    promotionRequest.id,
  );
}
