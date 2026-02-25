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

export async function postDiscussionBoardAdminBansBanIdRevoke(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IRevoke;
}): Promise<IDiscussionBoardBanRecord> {
  // Find the ban record and validate it's active
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Validate ban is active and not expired
  if (ban.ban_status !== "active") {
    throw new HttpException("Ban is not active", 400);
  }
  // For temporary bans, check if they've already expired
  const currentTime = toISOStringSafe(new Date());
  if (
    ban.ban_duration_type === "temporary" &&
    ban.ban_ends_at &&
    ban.ban_ends_at < new Date(currentTime)
  ) {
    throw new HttpException("Ban has already expired", 400);
  }
  // Update ban with revocation details using proper ISO strings
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: {
      revoked_at: new Date(currentTime),
      revoked_by_id: props.admin.id,
      revocation_reason: props.body.revoked_reason,
      ban_status: "revoked",
      updated_at: new Date(currentTime),
    },
  });
  // Retrieve updated ban record with complete details
  const updatedBan =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
