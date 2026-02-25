import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionApproval.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // Verify promotion request exists and is in pending status
  const request =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          discussion_board_user_id: true,
          status: true,
          discussion_board_administrator_id: true,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException(
      "Promotion request has already been processed",
      400,
    );
  }
  const now = new Date();
  let administratorAssignmentId: string | null = null;
  // Update promotion request based on approval decision
  if (props.body.approved) {
    // Create administrator assignment when approved
    const administrator =
      await MyGlobal.prisma.discussion_board_administrators.create({
        data: {
          id: v4(),
          user_id: request.discussion_board_user_id,
          grade: "regular",
          created_at: now,
          updated_at: now,
          promoted_at: now, // Add missing required field
          is_active: true, // Add missing required field
        },
      });
    administratorAssignmentId = administrator.id;
    // Update promotion request with approval details
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: "approved",
          approved_at: now,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          reviewer_notes: props.body.reviewer_notes ?? null,
          discussion_board_administrator_id: administratorAssignmentId,
          updated_at: now,
        },
      },
    );
  } else {
    // Update promotion request with rejection details
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: "rejected",
          rejected_at: now,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          reviewer_notes: props.body.reviewer_notes ?? null,
          updated_at: now,
        },
      },
    );
  }
  // Retrieve and return the updated promotion request
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  return DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    updatedRequest,
  );
}
