import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminPromotionRequestsRequestIdWorkflowsWorkflowId(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  workflowId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the promotion request exists
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findFirst(
      {
        where: {
          id: props.requestId,
          // No soft delete check needed as promotion_requests table doesn't have deleted_at
        },
      },
    );
  if (!promotionRequest) {
    throw new HttpException("Promotion request not found", 404);
  }
  // Verify the workflow record exists and belongs to the promotion request
  const workflowRecord =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.findFirst(
      {
        where: {
          id: props.workflowId,
          discussion_board_administrator_promotion_request_id: props.requestId,
          // No soft delete check needed as workflows table doesn't have deleted_at
        },
      },
    );
  if (!workflowRecord) {
    throw new HttpException("Workflow record not found", 404);
  }
  // Delete the workflow record
  await MyGlobal.prisma.discussion_board_promotion_request_workflows.delete({
    where: { id: props.workflowId },
  });
}
