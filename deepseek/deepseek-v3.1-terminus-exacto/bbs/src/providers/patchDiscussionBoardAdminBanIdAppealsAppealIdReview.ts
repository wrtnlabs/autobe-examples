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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBanIdAppealsAppealIdReview(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // First verify the appeal exists and belongs to the specified ban
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        id: props.appealId,
        discussion_board_ban_record_id: props.banId,
        deleted_at: null,
      },
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  if (!existingAppeal) {
    throw new HttpException(
      "Ban appeal not found or does not belong to the specified ban record",
      404,
    );
  }
  // Check if appeal is already reviewed
  if (existingAppeal.reviewed_at !== null) {
    throw new HttpException(
      "Ban appeal has already been reviewed and cannot be modified",
      400,
    );
  }
  // Validate status if provided
  if (props.body.status !== undefined && props.body.status !== null) {
    const validStatuses = ["pending", "under_review", "approved", "rejected"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status: ${props.body.status}. Must be one of: ${validStatuses.join(", ")}`,
        400,
      );
    }
    // Validate status transition from current state
    const currentStatus = existingAppeal.status;
    const validTransitions: Record<string, string[]> = {
      pending: ["under_review", "approved", "rejected"],
      under_review: ["approved", "rejected"],
      approved: [], // Final state
      rejected: [], // Final state
    };
    if (!validTransitions[currentStatus]?.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${props.body.status}`,
        400,
      );
    }
    // If transitioning to approved/rejected, ensure decision_reason is provided
    if (
      (props.body.status === "approved" || props.body.status === "rejected") &&
      (!props.body.decision_reason ||
        props.body.decision_reason.trim().length === 0)
    ) {
      throw new HttpException(
        "Decision reason is required when approving or rejecting an appeal",
        400,
      );
    }
  }
  // Prepare update data
  const currentTime = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    updated_at: currentTime,
  };
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
    // If status is being set to approved/rejected, set reviewed_at and reviewer
    if (props.body.status === "approved" || props.body.status === "rejected") {
      updateData.reviewed_at = currentTime;
      updateData.reviewer = { connect: { id: props.admin.id } };
    }
  }
  if (
    props.body.decision_reason !== undefined &&
    props.body.decision_reason !== null
  ) {
    updateData.decision_reason = props.body.decision_reason;
  }
  // Perform the update
  const updatedAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.update({
      where: { id: props.appealId },
      data: updateData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
  return await DiscussionBoardBanAppealTransformer.transform(updatedAppeal);
}
