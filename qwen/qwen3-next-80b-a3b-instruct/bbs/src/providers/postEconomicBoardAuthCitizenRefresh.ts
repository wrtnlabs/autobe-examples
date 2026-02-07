import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAuthCitizenRefresh(props: {
  body: IEconomicBoardCitizen.IRefresh;
}): Promise<IEconomicBoardCitizen.IAuthorized> {
  // Extract citizen context from framework-provided request context
  const citizen = MyGlobal.requestContext.citizen;
  // Validate session exists and active
  const session =
    await MyGlobal.prisma.economic_board_citizen_sessions.findFirst({
      where: {
        id: citizen.session_id,
        economic_board_citizen_id: citizen.id,
      },
    });
  if (!session || session.expired_at <= new Date().toISOString()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate citizen is active and verified
  const citizenRecord =
    await MyGlobal.prisma.economic_board_citizens.findUniqueOrThrow({
      where: { id: citizen.id },
    });
  if (citizenRecord.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (!citizenRecord.is_verified) {
    throw new HttpException("Account is not verified", 403);
  }
  if (citizenRecord.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Generate new tokens with same session_id
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: citizen.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "citizen",
      id: citizen.id,
      session_id: citizen.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session expiration
  await MyGlobal.prisma.economic_board_citizen_sessions.update({
    where: { id: citizen.session_id },
    data: { expired_at: refreshExpires },
  });
  // Return new tokens
  return {
    id: citizen.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
