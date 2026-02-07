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

export async function patchDiscussionBoardSuperAdminRequestIdReview(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorPromotionRequest.IReview;
}): Promise<IDiscussionBoardAdministratorPromotionRequest> {
  // Check if the promotion request exists and is pending
  const existingRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findUnique(
      {
        where: { id: props.requestId },
        ...DiscussionBoardAdministratorPromotionRequestTransformer.select(),
      },
    );
  if (!existingRequest) {
    throw new HttpException("Promotion request not found", 404);
  }
  if (existingRequest.status !== "pending") {
    throw new HttpException(
      "Promotion request has already been processed",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    let administratorId: string | null = null;
    if (props.body.approved) {
      // Create administrator assignment
      const administrator = await tx.discussion_board_administrators.create({
        data: {
          id: v4(),
          user_id: existingRequest.user.id,
          grade: "regular",
          promoted_at: new Date(now),
          grade_changed_at: null,
          is_active: true,
          created_at: new Date(now),
          updated_at: new Date(now),
        },
      });
      administratorId = administrator.id;
    }
    // Update the promotion request
    const updatedRequest =
      await tx.discussion_board_administrator_promotion_requests.update({
        where: { id: props.requestId },
        data: {
          status: props.body.approved ? "approved" : "rejected",
          approved_at: props.body.approved ? new Date(now) : null,
          rejected_at: props.body.approved ? null : new Date(now),
          reviewer_notes: props.body.notes ?? null,
          reviewer_discussion_board_super_admin_id: props.superAdmin.id,
          discussion_board_administrator_id: administratorId,
          updated_at: new Date(now),
        },
        ...DiscussionBoardAdministratorPromotionRequestTransformer.select(),
      });
    return updatedRequest;
  });
  return await DiscussionBoardAdministratorPromotionRequestTransformer.transform(
    result,
  );
}
