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

export async function putDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Find the existing ban record
  const existingBan =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  if (!existingBan) {
    throw new HttpException("Ban record not found", 404);
  }
  // Validate status transitions if provided
  if (props.body.ban_status) {
    if (props.body.ban_status === "revoked" && !props.body.revoked_reason) {
      throw new HttpException(
        "Revocation reason is required when revoking a ban",
        400,
      );
    }
    // Cannot reactivate an expired ban
    if (
      existingBan.ban_status === "expired" &&
      props.body.ban_status === "active"
    ) {
      throw new HttpException("Cannot reactivate an expired ban", 400);
    }
  }
  // Prepare update data - only update provided fields
  const updateData: any = {};
  if (props.body.ban_reason !== undefined) {
    updateData.ban_reason = props.body.ban_reason;
  }
  if (props.body.ban_duration_days !== undefined) {
    updateData.ban_duration_days = props.body.ban_duration_days;
  }
  if (props.body.ban_status !== undefined) {
    updateData.ban_status = props.body.ban_status;
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at
      ? props.body.expires_at
      : null;
  }
  if (props.body.revoked_at !== undefined) {
    updateData.revoked_at = props.body.revoked_at
      ? props.body.revoked_at
      : null;
  }
  if (props.body.revoked_reason !== undefined) {
    updateData.revoked_reason = props.body.revoked_reason;
  }
  // Always update the updated_at timestamp with current ISO string
  updateData.updated_at = new Date().toISOString();
  // Perform the update with transformer select
  const updatedBan = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: updateData,
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Transform and return using the transformer
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
