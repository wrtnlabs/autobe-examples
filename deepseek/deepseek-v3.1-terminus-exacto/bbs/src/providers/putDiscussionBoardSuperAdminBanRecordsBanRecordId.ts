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

export async function putDiscussionBoardSuperAdminBanRecordsBanRecordId(props: {
  superAdmin: SuperadminPayload;
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
  // Validate business rules
  if (
    props.body.ban_status &&
    props.body.ban_status !== existingRecord.ban_status
  ) {
    const validTransitions: Record<string, string[]> = {
      active: ["expired", "revoked"],
      expired: ["revoked"],
      revoked: [],
    };
    const currentStatus = existingRecord.ban_status;
    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(props.body.ban_status)) {
      throw new HttpException(
        `Invalid status transition from ${existingRecord.ban_status} to ${props.body.ban_status}`,
        400,
      );
    }
  }
  // Validate duration constraints
  if (props.body.ban_duration_days !== undefined) {
    if (
      props.body.ban_duration_days !== null &&
      props.body.ban_duration_days <= 0
    ) {
      throw new HttpException("Ban duration must be positive", 400);
    }
    // If changing from permanent to temporary ban, ensure expires_at is set
    if (
      existingRecord.ban_duration_days === null &&
      props.body.ban_duration_days !== null &&
      !props.body.expires_at
    ) {
      throw new HttpException(
        "Temporary ban requires expires_at to be set",
        400,
      );
    }
  }
  // Validate ban reason
  if (
    props.body.ban_reason !== undefined &&
    props.body.ban_reason.trim().length === 0
  ) {
    throw new HttpException("Ban reason cannot be empty", 400);
  }
  // Prepare update data with proper date handling
  const updateData: Prisma.discussion_board_ban_recordsUpdateInput = {
    ...(props.body.ban_reason !== undefined && {
      ban_reason: props.body.ban_reason,
    }),
    ...(props.body.ban_duration_days !== undefined && {
      ban_duration_days: props.body.ban_duration_days,
    }),
    ...(props.body.ban_status !== undefined && {
      ban_status: props.body.ban_status,
    }),
    ...(props.body.expires_at !== undefined && {
      expires_at: props.body.expires_at,
    }),
    ...(props.body.revoked_at !== undefined && {
      revoked_at: props.body.revoked_at,
    }),
    ...(props.body.revoked_reason !== undefined && {
      revoked_reason: props.body.revoked_reason,
    }),
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
