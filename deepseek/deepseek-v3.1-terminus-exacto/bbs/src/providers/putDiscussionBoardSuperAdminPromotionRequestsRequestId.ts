import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorPromotionRequestTransformer } from "../transformers/DiscussionBoardAdministratorPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardSuperAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionRequest.IUpdate;
}): Promise<IDiscussionBoardAdministratorPromotionRequest> {
  const promotionRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUnique(
      {
        where: { id: props.requestId },
      },
    );
  if (!promotionRequest) {
    throw new HttpException("Promotion request not found", 404);
  }
  if (promotionRequest.status !== "pending") {
    throw new HttpException(
      "Promotion request has already been processed",
      400,
    );
  }
  if (
    !props.body.status ||
    (props.body.status !== "approved" && props.body.status !== "rejected")
  ) {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    let administratorId: string | null = null;
    if (props.body.status === "approved") {
      const newAdministrator = await tx.discussion_board_administrators.create({
        data: {
          id: v4(),
          user_id: promotionRequest.discussion_board_user_id,
          grade: "regular",
          promoted_at: new Date(currentTimestamp),
          is_active: true,
          created_at: new Date(currentTimestamp),
          updated_at: new Date(currentTimestamp),
        },
      });
      administratorId = newAdministrator.id;
    }
    const updatedRequest =
      await tx.discussion_board_administrator_promotion_requests.update({
        where: { id: props.requestId },
        data: {
          status: props.body.status!,
          approved_at:
            props.body.status === "approved"
              ? new Date(currentTimestamp)
              : null,
          rejected_at:
            props.body.status === "rejected"
              ? new Date(currentTimestamp)
              : null,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          reviewer_notes: props.body.reviewer_notes ?? null,
          discussion_board_administrator_id: administratorId,
          updated_at: new Date(currentTimestamp),
        },
        ...DiscussionBoardAdministratorPromotionRequestTransformer.select(),
      });
    return await DiscussionBoardAdministratorPromotionRequestTransformer.transform(
      updatedRequest,
    );
  });
}
