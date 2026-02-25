import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminUserBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // First verify the ban record exists
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Prepare update data with current timestamp
  const currentTime = toISOStringSafe(new Date());
  const updateData: Prisma.discussion_board_user_bansUpdateInput = {
    updated_at: new Date(currentTime),
  };
  // Handle ban status updates with validation
  if (props.body.banStatus !== undefined) {
    // Validate status transition
    if (
      existingBan.ban_status === "expired" ||
      existingBan.ban_status === "revoked"
    ) {
      throw new HttpException(
        `Cannot modify ban status from terminal state '${existingBan.ban_status}'`,
        400,
      );
    }
    updateData.ban_status = props.body.banStatus;
    // Auto-set revocation fields if status is set to revoked
    if (props.body.banStatus === "revoked" && !existingBan.revoked_at) {
      updateData.revoked_at = new Date(currentTime);
      updateData.revoked_by_id = props.admin.id;
    }
  }
  // Handle appeal status updates
  if (props.body.appealStatus !== undefined) {
    updateData.appeal_status = props.body.appealStatus;
    // Auto-set appeal reviewed fields when appeal is processed
    if (
      existingBan.appeal_status === "pending" &&
      (props.body.appealStatus === "under_review" ||
        props.body.appealStatus === "approved" ||
        props.body.appealStatus === "rejected")
    ) {
      updateData.appeal_reviewed_at = new Date(currentTime);
      updateData.appeal_reviewer_id = props.admin.id;
    }
  }
  // Handle other mutable fields
  if (props.body.appealReason !== undefined) {
    updateData.appeal_reason = props.body.appealReason;
  }
  if (props.body.appealDecisionReason !== undefined) {
    updateData.appeal_decision_reason = props.body.appealDecisionReason;
  }
  if (props.body.revokedAt !== undefined) {
    updateData.revoked_at =
      props.body.revokedAt === null ? null : new Date(props.body.revokedAt);
    if (props.body.revokedAt !== null) {
      updateData.revoked_by_id = props.admin.id;
    }
  }
  if (props.body.revocationReason !== undefined) {
    updateData.revocation_reason = props.body.revocationReason;
  }
  // Perform update
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Fetch complete updated record
  const updatedBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
