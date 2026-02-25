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

export async function deleteDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ban record exists
  const ban =
    await MyGlobal.prisma.discussion_board_user_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  // Check if ban can be deleted
  if (ban.ban_status !== "active") {
    if (ban.ban_status === "revoked") {
      throw new HttpException("Ban has already been revoked", 400);
    } else if (ban.ban_status === "expired") {
      throw new HttpException("Ban has already expired", 400);
    } else if (ban.ban_status === "appealed") {
      throw new HttpException("Cannot delete ban with pending appeal", 400);
    } else {
      throw new HttpException("Cannot delete inactive ban record", 400);
    }
  }
  // For temporary bans, check if already expired by comparing ISO strings
  if (
    ban.ban_ends_at &&
    toISOStringSafe(ban.ban_ends_at) < toISOStringSafe(new Date())
  ) {
    throw new HttpException(
      "Ban has already expired and cannot be deleted",
      400,
    );
  }
  // Delete the ban record
  await MyGlobal.prisma.discussion_board_user_bans.delete({
    where: { id: props.banId },
  });
  // Record audit trail using correct field names from schema
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_type: "admin",
      target_user_id: ban.banned_user_id,
      action_type: "user_ban_deleted",
      action_subtype: "admin_action",
      description: `Ban record ${props.banId} deleted by administrator`,
      success: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}
