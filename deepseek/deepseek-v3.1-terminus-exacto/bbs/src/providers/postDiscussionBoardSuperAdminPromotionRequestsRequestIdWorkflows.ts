import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorPromotionRequestWorkflowCollector } from "../collectors/DiscussionBoardAdministratorPromotionRequestWorkflowCollector";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorPromotionRequestWorkflowTransformer } from "../transformers/DiscussionBoardAdministratorPromotionRequestWorkflowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminPromotionRequestsRequestIdWorkflows(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionRequestWorkflow.ICreate;
}): Promise<IDiscussionBoardAdministratorPromotionRequestWorkflow> {
  // First, validate that the promotion request exists and get current status
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  // Validate status transition is valid based on current state
  validateStatusTransition(promotionRequest.status, props.body.status);
  // Create workflow record using Collector
  await MyGlobal.prisma.discussion_board_promotion_request_workflows.create({
    data: await DiscussionBoardAdministratorPromotionRequestWorkflowCollector.collect(
      {
        body: props.body,
        discussionBoardAdministratorPromotionRequests: { id: props.requestId },
        discussionBoardSuperAdmins: { id: props.superAdmin.id },
        discussionBoardSuperAdminSessions: { id: props.superAdmin.session_id },
      },
    ),
  });
  // Retrieve the created workflow record with transformer select for proper response
  // Need to find the latest workflow for this request, so order by created_at desc and take first
  const workflows =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.findMany(
      {
        where: {
          discussion_board_administrator_promotion_request_id: props.requestId,
        },
        orderBy: { created_at: "desc" },
        take: 1,
        ...DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.select(),
      },
    );
  if (workflows.length === 0) {
    throw new HttpException("Workflow not found after creation", 500);
  }
  return await DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.transform(
    workflows[0],
  );
}
function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
): void {
  const validTransitions: Record<string, string[]> = {
    pending: ["under_review"],
    under_review: ["approved", "rejected"],
    approved: [],
    rejected: [],
  };
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new HttpException(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      400,
    );
  }
}
