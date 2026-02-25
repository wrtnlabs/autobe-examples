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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminUserBansBanId(props: {
  superAdmin: SuperAdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // First verify the ban exists
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Build update data with proper conditional logic for nullable fields
  const updateData: Record<string, any> = {
    updated_at: new Date(),
  };
  // Handle appeal status and timestamps
  if (props.body.banStatus !== undefined) {
    updateData.ban_status = props.body.banStatus;
  }
  if (props.body.appealStatus !== undefined) {
    updateData.appeal_status = props.body.appealStatus;
    // Set appeal timestamps when appeal status changes
    if (
      props.body.appealStatus === "under_review" ||
      props.body.appealStatus === "approved" ||
      props.body.appealStatus === "rejected"
    ) {
      updateData.appeal_reviewed_at = new Date();
      updateData.appeal_reviewer_id = props.superAdmin.id;
    }
  }
  // Handle appeal reason if provided
  if (props.body.appealReason !== undefined) {
    updateData.appeal_reason = props.body.appealReason;
  }
  // Handle decision reason if appeal status changes
  if (
    props.body.appealDecisionReason !== undefined &&
    (props.body.appealStatus === "under_review" ||
      props.body.appealStatus === "approved" ||
      props.body.appealStatus === "rejected")
  ) {
    updateData.appeal_decision_reason = props.body.appealDecisionReason;
  }
  // Handle appeal reviewed timestamp if reviewer ID provided
  if (
    typeof props.body.appealDecisionReason === "string" &&
    props.body.appealDecisionReason.trim() !== ""
  ) {
    updateData.appeal_decision_reason = props.body.appealDecisionReason;
  }
  // Handle revocation fields
  if (props.body.revokedAt !== undefined) {
    updateData.revoked_at = props.body.revokedAt
      ? new Date(props.body.revokedAt)
      : null;
    updateData.revoked_by_id = props.superAdmin.id;
  }
  if (props.body.revocationReason !== undefined) {
    updateData.revocation_reason = props.body.revocationReason;
  }
  // Execute the update operation
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // Retrieve and transform the updated ban record
  const updatedBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUnique({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  if (!updatedBan) {
    throw new Error("Ban record not found after update");
  }
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
