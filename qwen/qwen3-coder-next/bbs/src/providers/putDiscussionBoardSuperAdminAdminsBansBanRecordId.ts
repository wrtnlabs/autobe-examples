import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminAdminsBansBanRecordId(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string;
  body: IDiscussionBoardBansBanRecord.IUpdate;
}): Promise<IDiscussionBoardBansBanRecord> {
  // Find existing ban record
  const existing =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!existing) {
    throw new HttpException("Ban record not found", 404);
  }
  // Update with provided fields
  const updated =
    await MyGlobal.prisma.discussion_board_bans_ban_records.update({
      where: { id: props.banRecordId },
      data: {
        ...props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Transform to response format
  return {
    id: updated.id,
    user_id: updated.user_id,
    admin_id: updated.admin_id,
    reason: updated.reason,
    start_time: updated.start_time ? toISOStringSafe(updated.start_time) : null,
    end_time: updated.end_time ? toISOStringSafe(updated.end_time) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
