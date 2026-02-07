import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
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

export async function postDiscussionBoardSuperAdminModerationQueueBanRecordId(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string;
  body: IDiscussionBoardBansAppeal.ICreate;
}): Promise<IDiscussionBoardBansAppeal> {
  // Query the ban record to get user_id and verify existence
  const banRecord =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Create the appeal record with proper database structure
  const appeal = await MyGlobal.prisma.discussion_board_bans_appeals.create({
    data: {
      id: v4(),
      ban_record_id: props.banRecordId,
      user_id: banRecord.user_id,
      status: "pending",
      review_notes: null,
      appeal_created_at: toISOStringSafe(new Date()),
      reviewed_at: null,
      appeal_reason: "Appeal against ban",
    },
  });
  // Return properly typed response
  return {
    id: appeal.id,
    ban_record_id: appeal.ban_record_id,
    user_id: appeal.user_id,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    review_notes: appeal.review_notes,
    appeal_created_at: appeal.appeal_created_at,
    reviewed_at: appeal.reviewed_at,
  };
}
