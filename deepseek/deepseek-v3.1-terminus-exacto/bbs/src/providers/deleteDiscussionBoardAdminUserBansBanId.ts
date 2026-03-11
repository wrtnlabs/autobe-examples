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
  // First, check if the ban exists
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        admin_id: true,
        status: true,
        unbanned_at: true,
      },
    });
  // Validate ban is active
  if (ban.status !== "active") {
    throw new HttpException("Cannot remove a ban that is not active", 400);
  }
  // Check if ban has already been removed
  if (ban.unbanned_at !== null) {
    throw new HttpException("Ban has already been removed", 400);
  }
  // Check authorization
  const isBanningAdmin = ban.admin_id === props.admin.id;
  if (!isBanningAdmin) {
    // If not the banning admin, check if they have super admin privileges
    const admin =
      await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
        where: {
          id: props.admin.id,
          deleted_at: null,
        },
        select: {
          id: true,
          admin_grade: true,
        },
      });
    // Only super admins can remove bans they didn't create
    if (admin.admin_grade !== "super") {
      throw new HttpException(
        "Only super administrators can remove bans created by other admins",
        403,
      );
    }
  }
  // Update the ban record to mark as removed
  const now = new Date();
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: {
      status: "removed",
      unbanned_at: now,
      updated_at: now,
    },
  });
}
