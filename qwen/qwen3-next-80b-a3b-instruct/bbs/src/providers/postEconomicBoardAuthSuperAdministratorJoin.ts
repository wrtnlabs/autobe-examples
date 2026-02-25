import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicBoardAuthSuperAdministratorJoin(props: {
  ip: string;
  body: IEconomicBoardSuperAdministrator.IJoin;
}): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  // CRITICAL: Registering superAdministrator requires validating email + password through credential store
  // economic_board_super_administrators has no email field — email is stored in economic_board_super_administrator_password_resets
  // So we must validate uniqueness against economic_board_super_administrator_password_resets
  // 1. Validate email uniqueness in password reset table
  const existingCred =
    await MyGlobal.prisma.economic_board_super_administrator_password_resets.findFirst(
      {
        where: { email: props.body.email } as any,
      },
    );
  if (existingCred) throw new HttpException("Email already registered", 409);
  // 2. Create superAdministrator identity record in placeholder table
  const admin =
    await MyGlobal.prisma.economic_board_super_administrators.create({
      data: {
        id: v4(),
      },
    });
  // 3. Create session record with access and refresh tokens
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.create({
      data: {
        id: v4(),
        administrator_id: admin.id,
        access_token: "",
        refresh_token: "",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        expired_at: toISOStringSafe(accessExpires) as string &
          tags.Format<"date-time">,
        ip_address: props.ip ?? "",
      },
    });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superAdministrator",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdministrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // 5. Return IAuthorized
  return {
    id: admin.id as string & tags.Format<"uuid">,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    } satisfies IEconomicBoardSuperAdministrator.IAuthorized["token"],
  } satisfies IEconomicBoardSuperAdministrator.IAuthorized;
}
