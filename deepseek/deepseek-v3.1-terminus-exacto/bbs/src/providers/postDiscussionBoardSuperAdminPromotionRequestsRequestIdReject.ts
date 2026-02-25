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

export async function postDiscussionBoardSuperAdminPromotionRequestsRequestIdReject(props: {
  superAdmin: SuperAdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionApproval.IReject;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  // First, verify the promotion request exists and is in pending status
  const existingRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  if (existingRequest.status !== "pending") {
    throw new HttpException(
      `Promotion request cannot be rejected because it is already ${existingRequest.status}`,
      400,
    );
  }
  const now = new Date().toISOString();
  // Update the request with rejection details
  const updatedRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.update(
      {
        where: { id: props.requestId },
        data: {
          status: "rejected",
          rejected_at: now,
          reviewer_notes: props.body.reviewer_notes ?? null,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          updated_at: now,
        },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    updatedRequest,
  );
}
