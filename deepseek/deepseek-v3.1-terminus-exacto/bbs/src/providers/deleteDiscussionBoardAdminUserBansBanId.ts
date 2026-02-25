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

export async function deleteDiscussionBoardAdminUserBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the ban exists
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Check if ban is currently active
  if (ban.ban_status !== "active") {
    throw new HttpException(
      `Cannot revoke ban with status: ${ban.ban_status}`,
      400,
    );
  }
  // Check if ban has naturally expired using string comparison
  const now = toISOStringSafe(new Date());
  const banEndsAtISO = ban.ban_ends_at
    ? toISOStringSafe(ban.ban_ends_at)
    : null;
  if (banEndsAtISO && banEndsAtISO < now) {
    throw new HttpException("Ban has already expired naturally", 400);
  }
  // Soft delete by updating ban status to revoked
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: {
      ban_status: "revoked",
      revoked_at: now,
      revoked_by_id: props.admin.id,
      revocation_reason: "Revoked by administrator via API",
      updated_at: now,
    },
  });
}
