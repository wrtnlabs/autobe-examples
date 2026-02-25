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

export async function postDiscussionBoardSuperAdminPromotionRequestsRequestIdApprove(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionApproval.IApprove;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // First, verify the promotion request exists and is in pending status
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          discussion_board_user_id: true,
          discussion_board_administrator_id: true,
        },
      },
    );
  if (promotionRequest.status !== "pending") {
    throw new HttpException("Promotion request is not in pending status", 400);
  }
  // Check if user already has an administrator record
  let administratorId: string | null =
    promotionRequest.discussion_board_administrator_id;
  if (!administratorId) {
    // Create new administrator record for the user
    const now = toISOStringSafe(new Date());
    const newAdministrator =
      await MyGlobal.prisma.discussion_board_administrators.create({
        data: {
          id: v4(),
          user_id: promotionRequest.discussion_board_user_id,
          grade: "regular",
          created_at: now,
          updated_at: now,
          promoted_at: now,
          is_active: true,
        },
      });
    administratorId = newAdministrator.id;
  }
  // Update the promotion request with approval details
  const now = toISOStringSafe(new Date());
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: "approved",
          approved_at: now,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          reviewer_notes: props.body.reviewer_notes ?? null,
          discussion_board_administrator_id: administratorId,
          updated_at: now,
        },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    updatedRequest,
  );
}
