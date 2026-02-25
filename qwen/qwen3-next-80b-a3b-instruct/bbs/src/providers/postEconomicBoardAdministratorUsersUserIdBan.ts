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
import { EconomicBoardCitizenTransformer } from "../transformers/EconomicBoardCitizenTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAdministratorUsersUserIdBan(props: {
  administrator: AdministratorPayload;
  userId: string;
  body: IEconomicBoardCitizen;
}): Promise<IEconomicBoardCitizen> {
  const { administrator, userId, body } = props;
  // Validate ban reason is provided and within 10-500 character limit
  if (
    !body.ban_reason ||
    body.ban_reason.length < 10 ||
    body.ban_reason.length > 500
  ) {
    throw new HttpException(
      "Ban reason must be between 10 and 500 characters",
      400,
    );
  }
  // Find the target user
  const citizen =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: userId },
    });
  // Prevent banning already-banned users
  if (citizen.is_banned) {
    throw new HttpException("User is already banned", 400);
  }
  // Prevent self-banning
  if (citizen.id === administrator.id) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // Update citizen record
  const updatedCitizen = await MyGlobal.prisma.economic_board_citizens.update({
    where: { id: userId },
    data: {
      is_banned: true,
      ban_reason: body.ban_reason,
      updated_at: new Date().toISOString(),
    },
  });
  // Invalidate all sessions for this user
  await MyGlobal.prisma.economic_board_citizen_sessions.deleteMany({
    where: { citizen_id: userId },
  });
  // Log the action in audit
  await MyGlobal.prisma.economic_board_administrator_audit_logs.create({
    data: {
      actor_id: administrator.id,
      target_id: userId,
      action_type: "ban",
      reason: body.ban_reason,
      ip_address: "127.0.0.1", // Placeholder; in production, use actual request IP
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      id: v4(), // Generate UUID for audit log
    },
  });
  // Return transformed DTO with _count included
  const citizenWithCount =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        _count: {
          select: {
            comments: true,
            articles: true,
          },
        },
      },
    });
  return EconomicBoardCitizenTransformer.transform(citizenWithCount);
}
