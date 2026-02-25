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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorPromotionRequestWorkflowTransformer } from "../transformers/DiscussionBoardAdministratorPromotionRequestWorkflowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminPromotionRequestsRequestIdWorkflows(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotionRequestWorkflow> {
  // Validate that the promotion request exists
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  // Business rule: If no status provided in update, default to creating a workflow with current status
  const status = props.body.status ?? "pending";
  // Validate status transitions according to business workflow rules
  const validTransitions = {
    pending: ["under_review"],
    under_review: ["approved", "rejected"],
    approved: [],
    rejected: [],
  } as const;
  // Get the latest workflow status to determine valid transitions
  const latestWorkflow =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.findFirst(
      {
        where: {
          discussion_board_administrator_promotion_request_id: props.requestId,
        },
        orderBy: { created_at: "desc" },
      },
    );
  const currentStatus = latestWorkflow?.status || "pending";
  // Check if transition is valid
  const transitions =
    validTransitions[currentStatus as keyof typeof validTransitions];
  // Handle empty transitions array (approved/rejected statuses)
  if (transitions.length === 0 && status !== currentStatus) {
    // Final states (approved/rejected) cannot transition to any other state
    throw new HttpException(
      `Invalid status transition from ${currentStatus} to ${status}. Final states cannot be changed.`,
      400,
    );
  }
  // Only check transitions when they exist
  if (transitions.length > 0) {
    // Use string comparison instead of includes to avoid type narrowing issues
    if (currentStatus === "pending" && status !== "under_review") {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${status}`,
        400,
      );
    } else if (
      currentStatus === "under_review" &&
      status !== "approved" &&
      status !== "rejected"
    ) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${status}`,
        400,
      );
    }
  }
  // Create new workflow record with timestamp as ISO string
  const currentIsoString = toISOStringSafe(new Date());
  const newWorkflow =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.create({
      data: {
        id: v4(),
        discussion_board_administrator_promotion_request_id: props.requestId,
        status: status,
        notes: props.body.notes ?? null,
        created_at: currentIsoString,
      },
      ...DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.select(),
    });
  // If this is a final decision (approved/rejected), update the parent promotion request
  if (status === "approved" || status === "rejected") {
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: status,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          reviewer_notes: props.body.notes ?? null,
          [status === "approved" ? "approved_at" : "rejected_at"]:
            currentIsoString,
          updated_at: currentIsoString,
        },
      },
    );
  }
  return await DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.transform(
    newWorkflow,
  );
}
