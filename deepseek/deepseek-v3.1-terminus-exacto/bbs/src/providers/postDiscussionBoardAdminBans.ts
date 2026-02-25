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

export async function postDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // 1. Validate target user exists
  await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.body.bannedUserId },
  });
  // 2. Validate ban duration for temporary bans
  if (props.body.banDurationType === "temporary") {
    if (!props.body.banDurationDays) {
      throw new HttpException(
        "Ban duration days required for temporary bans",
        400,
      );
    }
    if (props.body.banDurationDays < 1 || props.body.banDurationDays > 365) {
      throw new HttpException(
        "Ban duration must be between 1 and 365 days for temporary bans",
        400,
      );
    }
  } else if (
    props.body.banDurationDays !== undefined &&
    props.body.banDurationDays !== null
  ) {
    throw new HttpException(
      "Ban duration days must be null for permanent bans",
      400,
    );
  }
  // 3. Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        banned_user_id: props.body.bannedUserId,
        ban_status: "active",
      },
    });
  if (existingBan) {
    throw new HttpException("User already has an active ban", 400);
  }
  // 4. Calculate ban_ends_at for temporary bans
  const now = new Date();
  let banEndsAt: Date | null = null;
  if (
    props.body.banDurationType === "temporary" &&
    props.body.banDurationDays
  ) {
    const endDate = new Date(
      now.getTime() + props.body.banDurationDays * 24 * 60 * 60 * 1000,
    );
    banEndsAt = endDate;
  }
  // 5. Create ban record
  const ban = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: {
      id: v4(),
      banned_user_id: props.body.bannedUserId,
      banning_administrator_id: props.admin.id,
      ban_reason: props.body.banReason,
      ban_duration_type: props.body.banDurationType,
      ban_duration_days: props.body.banDurationDays ?? null,
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
  // 6. Transform and return
  return await DiscussionBoardBanRecordTransformer.transform(ban);
}
