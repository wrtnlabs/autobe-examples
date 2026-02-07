import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminModerationQueueBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string;
  body: IDiscussionBoardBansAppeal.ICreate;
}): Promise<IDiscussionBoardBansAppeal> {
  // Query ban record to verify existence and get user_id
  const banRecord =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) throw new HttpException("Ban record not found", 404);
  // Create appeal with generated ID and proper types
  // Use hardcoded appeal_reason as ICreate doesn't expose it
  const created = await MyGlobal.prisma.discussion_board_bans_appeals.create({
    data: {
      id: v4(),
      ban_record_id: props.banRecordId,
      user_id: banRecord.user_id,
      appeal_reason: "Appeal against ban",
      status: "pending" as const,
      review_notes: null,
      appeal_created_at: typia.assert<string & tags.Format<"date-time">>(
        new Date().toISOString(),
      ),
      reviewed_at: null,
    },
  });
  // Convert to response type with proper datetime formatting
  return {
    id: created.id,
    ban_record_id: created.ban_record_id,
    user_id: created.user_id,
    appeal_reason: created.appeal_reason,
    status: created.status,
    review_notes: created.review_notes,
    appeal_created_at: typia.assert<string & tags.Format<"date-time">>(
      created.appeal_created_at,
    ),
    reviewed_at: created.reviewed_at
      ? typia.assert<string & tags.Format<"date-time">>(created.reviewed_at)
      : null,
  };
}
