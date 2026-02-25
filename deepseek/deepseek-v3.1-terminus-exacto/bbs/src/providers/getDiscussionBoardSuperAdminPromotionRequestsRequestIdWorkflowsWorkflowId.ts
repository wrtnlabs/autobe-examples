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

export async function getDiscussionBoardSuperAdminPromotionRequestsRequestIdWorkflowsWorkflowId(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  workflowId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPromotionRequestWorkflow> {
  // Verify the promotion request exists first (optional but good for validation)
  await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
    },
  );
  // Fetch the workflow record ensuring it belongs to the specified promotion request
  const workflow =
    await MyGlobal.prisma.discussion_board_promotion_request_workflows.findUniqueOrThrow(
      {
        where: {
          id: props.workflowId,
          discussion_board_administrator_promotion_request_id: props.requestId,
        },
        ...DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.select(),
      },
    );
  // Transform database record to API response DTO format
  return await DiscussionBoardAdministratorPromotionRequestWorkflowTransformer.transform(
    workflow,
  );
}
