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

export async function putDiscussionBoardSuperAdminPromotionRequestsRequestIdWorkflowsWorkflowId(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  workflowId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionRequestWorkflow.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotionRequestWorkflow> {
  // Validate promotion request exists
  await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
    },
  );
  // Validate valid status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["pending", "under_review", "approved", "rejected"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }
  // Validate workflow exists and belongs to the specified promotion request
  await MyGlobal.prisma.discussion_board_promotion_request_workflows.findFirstOrThrow(
    {
      where: {
        id: props.workflowId,
        discussion_board_administrator_promotion_request_id: props.requestId,
      },
    },
  );
  // Update the workflow record with conditional updates
  const updateData: Prisma.discussion_board_promotion_request_workflowsUpdateInput =
    {};
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.notes !== undefined) {
    updateData.notes = props.body.notes ?? null;
  }
  await MyGlobal.prisma.discussion_board_promotion_request_workflows.update({
    where: { id: props.workflowId },
    data: updateData,
  });
  // Fetch the complete updated workflow with relations
  const updatedWorkflow =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.findUniqueOrThrow(
      {
        where: { id: props.workflowId },
        ...DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.transform(
    updatedWorkflow,
  );
}
