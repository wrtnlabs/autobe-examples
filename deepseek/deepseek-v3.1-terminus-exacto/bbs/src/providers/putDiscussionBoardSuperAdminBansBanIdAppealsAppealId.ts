import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBansBanIdAppealsAppealId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // First, verify the appeal exists and belongs to the specified ban
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findUnique({
      where: {
        id: props.appealId,
        discussion_board_ban_record_id: props.banId,
        deleted_at: null,
      },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  if (!existingAppeal) {
    throw new HttpException("Ban appeal not found", 404);
  }
  // Validate workflow transitions
  const currentStatus = existingAppeal.status;
  const newStatus = props.body.status;
  // Define valid status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ["under_review", "approved", "rejected"],
    under_review: ["approved", "rejected"],
    approved: [], // Cannot transition from approved
    rejected: [], // Cannot transition from rejected
  };
  // Check if the transition is valid
  if (newStatus && newStatus !== currentStatus) {
    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new HttpException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        400,
      );
    }
  }
  // Validate decision_reason is provided for final decisions
  if (
    (newStatus === "approved" || newStatus === "rejected") &&
    (!props.body.decision_reason ||
      props.body.decision_reason.trim().length === 0)
  ) {
    throw new HttpException(
      "Decision reason is required when approving or rejecting an appeal",
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Update status if provided
  if (newStatus !== undefined && newStatus !== null) {
    updateData.status = newStatus;
  }
  // Update decision_reason if provided
  if (
    props.body.decision_reason !== undefined &&
    props.body.decision_reason !== null
  ) {
    updateData.decision_reason = props.body.decision_reason;
  }
  // Set reviewed_at and reviewer when transitioning to final decision
  const isTransitioningToFinal =
    (currentStatus === "pending" || currentStatus === "under_review") &&
    (newStatus === "approved" || newStatus === "rejected");
  if (isTransitioningToFinal) {
    updateData.reviewed_at = toISOStringSafe(new Date());
    updateData.reviewer = { connect: { id: props.superAdmin.id } };
  }
  // Update the appeal
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: props.appealId },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
