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

export async function postDiscussionBoardAdminUserBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // Verify target user exists
  await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.body.bannedUserId },
  });
  // Check if user already has active ban
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        banned_user_id: props.body.bannedUserId,
        ban_status: { in: ["active", "appealed"] },
      },
    });
  if (existingBan) {
    throw new HttpException("User already has active ban", 400);
  }
  // Prepare data manually since Collector returns wrong table format
  const id = v4();
  const now = new Date();
  const banEndsAt =
    props.body.banDurationType === "temporary" && props.body.banDurationDays
      ? new Date(
          now.getTime() + props.body.banDurationDays * 24 * 60 * 60 * 1000,
        )
      : null;
  const created = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: {
      id,
      banned_user_id: props.body.bannedUserId,
      banning_administrator_id: props.admin.id,
      ban_reason: props.body.banReason,
      ban_duration_type: props.body.banDurationType,
      ban_duration_days:
        props.body.banDurationType === "temporary"
          ? props.body.banDurationDays
          : null,
      ban_started_at: now,
      ban_ends_at: banEndsAt,
      ban_status: "active",
      appeal_status: "none",
      appeal_reason: null,
      appeal_reviewed_at: null,
      appeal_reviewer_id: null,
      appeal_decision_reason: null,
      revoked_at: null,
      revoked_by_id: null,
      revocation_reason: null,
      created_at: now,
      updated_at: now,
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(created);
}
