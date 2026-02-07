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

export async function putDiscussionBoardSuperAdminBanRecordsBanRecordIdAppealsAppealId(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string & tags.Format<"uuid">;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.IUpdate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Verify ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Verify appeal exists and belongs to the ban record
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.findUnique({
    where: {
      id: props.appealId,
      discussion_board_ban_record_id: props.banRecordId,
      deleted_at: null,
    },
  });
  if (!appeal) {
    throw new HttpException("Appeal not found", 404);
  }
  // Check if appeal is already reviewed
  if (appeal.reviewed_at !== null) {
    throw new HttpException("Appeal has already been reviewed", 400);
  }
  // Validate status transition
  const currentStatus = appeal.status;
  const newStatus = props.body.status;
  // Valid status values
  const validStatuses = ["pending", "under_review", "approved", "rejected"];
  if (newStatus && !validStatuses.includes(newStatus)) {
    throw new HttpException("Invalid status value", 400);
  }
  // Only allow transitions from pending/under_review to approved/rejected
  const reviewableStatuses = ["pending", "under_review"];
  const finalStatuses = ["approved", "rejected"];
  if (
    newStatus &&
    finalStatuses.includes(newStatus) &&
    !reviewableStatuses.includes(currentStatus)
  ) {
    throw new HttpException("Appeal is not in a reviewable state", 400);
  }
  // Validate decision reason is provided when approving/rejecting
  if (
    newStatus &&
    finalStatuses.includes(newStatus) &&
    !props.body.decision_reason
  ) {
    throw new HttpException(
      "Decision reason is required when approving or rejecting an appeal",
      400,
    );
  }
  // Prepare update data
  const now = toISOStringSafe(new Date().toISOString());
  const updateData: Prisma.discussion_board_ban_appealsUpdateInput = {
    status: newStatus ?? appeal.status,
    decision_reason: props.body.decision_reason,
    // Correct property name should be used instead of 'admin_id'
    updated_at: now,
  };
  // Set reviewed_at timestamp when transitioning to approved/rejected
  if (newStatus && finalStatuses.includes(newStatus)) {
    updateData.reviewed_at = now;
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
