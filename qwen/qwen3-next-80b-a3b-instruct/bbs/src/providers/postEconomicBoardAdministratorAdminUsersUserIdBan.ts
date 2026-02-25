import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicBoardAdministratorAdminUsersUserIdBan(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconomicBoardCitizen.IBanReason;
}): Promise<void> {
  // Validate ban reason length
  if (
    !props.body.reason ||
    props.body.reason.length < 10 ||
    props.body.reason.length > 500
  ) {
    throw new HttpException(
      "Ban reason must be between 10 and 500 characters",
      400,
    );
  }
  // Validate administrator is not banning themselves
  if (props.administrator.id === props.userId) {
    throw new HttpException("Cannot ban yourself", 403);
  }
  // Find target user (citizen or administrator)
  const targetUser = await MyGlobal.prisma.economic_board_citizens.findUnique({
    where: { id: props.userId },
  });
  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }
  // Verify user is not already banned
  if (targetUser.is_banned) {
    throw new HttpException("User is already banned", 400);
  }
  // Update user status to banned
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: props.userId },
    data: {
      is_banned: true,
      ban_reason: props.body.reason,
    },
  });
  // Clear all active sessions for this user
  await MyGlobal.prisma.economic_board_citizen_sessions.deleteMany({
    where: { citizen_id: props.userId },
  });
  // Log audit event
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.administrator.id,
      target_id: props.userId,
      action_type: "ban",
      reason: props.body.reason,
      ip_address: "unknown",
      created_at: now,
      updated_at: now,
    },
  });
}
