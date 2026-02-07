import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // First, verify the ban record exists
  const existingBan =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banId },
    });
  if (!existingBan) {
    throw new HttpException("Ban record not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_ban_recordsUpdateInput = {};
  // Only update fields that are provided in the request body
  if (props.body.ban_reason !== undefined) {
    updateData.ban_reason = props.body.ban_reason;
  }
  if (props.body.ban_duration_days !== undefined) {
    updateData.ban_duration_days = props.body.ban_duration_days;
    // Recalculate expires_at if ban_duration_days changes
    if (
      props.body.ban_duration_days !== null &&
      props.body.ban_duration_days > 0
    ) {
      const createdDate = new Date(existingBan.created_at);
      const expiresDate = new Date(
        createdDate.getTime() +
          props.body.ban_duration_days * 24 * 60 * 60 * 1000,
      );
      updateData.expires_at = expiresDate;
    } else {
      updateData.expires_at = null;
    }
  }
  if (props.body.ban_status !== undefined) {
    updateData.ban_status = props.body.ban_status;
    // Validate status transitions
    if (props.body.ban_status === "revoked") {
      if (!props.body.revoked_reason) {
        throw new HttpException(
          "Revocation reason is required when changing status to revoked",
          400,
        );
      }
      updateData.revoked_at = new Date();
      updateData.revoked_reason = props.body.revoked_reason || "";
    } else if (props.body.ban_status === "expired") {
      if (existingBan.expires_at && new Date() < existingBan.expires_at) {
        throw new HttpException(
          "Cannot set status to expired before the ban duration has ended",
          400,
        );
      }
    }
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at
      ? new Date(props.body.expires_at)
      : null;
  }
  if (props.body.revoked_at !== undefined) {
    updateData.revoked_at = props.body.revoked_at
      ? new Date(props.body.revoked_at)
      : null;
    // If revoked_at is set, ensure status is 'revoked' and reason is provided
    if (
      props.body.revoked_at &&
      (!props.body.ban_status || props.body.ban_status !== "revoked")
    ) {
      throw new HttpException(
        "Status must be 'revoked' when revoked_at is set",
        400,
      );
    }
    if (props.body.revoked_at && !props.body.revoked_reason) {
      throw new HttpException(
        "Revocation reason is required when revoked_at is set",
        400,
      );
    }
  }
  if (props.body.revoked_reason !== undefined) {
    updateData.revoked_reason = props.body.revoked_reason;
    // If revoked_reason is provided without revoked_at, set revoked_at to current time
    if (
      props.body.revoked_reason &&
      !props.body.revoked_at &&
      (!props.body.ban_status || props.body.ban_status !== "revoked")
    ) {
      throw new HttpException(
        "Status must be 'revoked' when revocation reason is provided",
        400,
      );
    }
    if (props.body.revoked_reason && !props.body.revoked_at) {
      updateData.revoked_at = new Date();
      updateData.ban_status = "revoked";
    }
  }
  // Always update the updated_at timestamp
  updateData.updated_at = new Date();
  // Perform the update
  const updatedBan = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: updateData,
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
