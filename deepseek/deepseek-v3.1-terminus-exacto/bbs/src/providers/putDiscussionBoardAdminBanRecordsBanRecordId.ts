import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardAdminBanRecordsBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Check if ban record exists
  const existingRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!existingRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Business rule validation for status transitions
  if (props.body.ban_status) {
    const validTransitions = {
      active: ["expired", "revoked"],
      expired: ["revoked"],
      revoked: [],
    } as const;
    const currentStatus = existingRecord.ban_status;
    const newStatus = props.body.ban_status;
    // Use a simpler approach without complex type assertions
    if (
      currentStatus === "active" &&
      (newStatus === "expired" || newStatus === "revoked")
    ) {
      // Valid transition for active status
    } else if (currentStatus === "expired" && newStatus === "revoked") {
      // Valid transition for expired status
    } else if (currentStatus === "revoked") {
      // No valid transitions from revoked status
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    } else if (currentStatus !== newStatus) {
      // Invalid transition for other cases
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Handle expires_at logic
  let expiresAt: string | null | undefined = undefined;
  if (
    props.body.ban_duration_days !== undefined &&
    props.body.ban_duration_days !== null
  ) {
    // Temporary ban - calculate expires_at based on created_at + duration
    const createdDate = new Date(existingRecord.created_at);
    createdDate.setDate(createdDate.getDate() + props.body.ban_duration_days);
    expiresAt = toISOStringSafe(createdDate);
  } else if (props.body.ban_duration_days === null) {
    // Permanent ban - null expires_at
    expiresAt = null;
  }
  const updateData = {
    ban_reason: props.body.ban_reason ?? existingRecord.ban_reason,
    ban_duration_days:
      props.body.ban_duration_days ?? existingRecord.ban_duration_days,
    ban_status: props.body.ban_status ?? existingRecord.ban_status,
    expires_at: expiresAt !== undefined ? expiresAt : existingRecord.expires_at,
    revoked_at: props.body.revoked_at
      ? toISOStringSafe(new Date(props.body.revoked_at))
      : existingRecord.revoked_at,
    revoked_reason: props.body.revoked_reason ?? existingRecord.revoked_reason,
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedRecord =
    await MyGlobal.prisma.discussion_board_ban_records.update({
      where: { id: props.banRecordId },
      data: updateData,
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updatedRecord);
}
