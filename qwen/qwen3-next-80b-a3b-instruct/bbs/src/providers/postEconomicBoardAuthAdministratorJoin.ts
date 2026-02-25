import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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
export async function postEconomicBoardAuthAdministratorJoin(props: {
  body: IEconomicBoardAdministrator.IJoin;
}): Promise<IEconomicBoardAdministrator.IAuthorized> {
  // 1. Look up administrator by email
  const admin = await MyGlobal.prisma.economic_board_administrators.findFirst({
    where: { email: props.body.email },
  });
  // 2. Validate administrator exists and request is approved
  if (!admin) throw new HttpException("Invalid credentials", 401);
  if (admin.admin_request_status !== "approved")
    throw new HttpException("Administrator promotion not approved", 403);
  // 3. Validate password and not banned
  if (!PasswordUtil.verify(props.body.password, admin.password_hash))
    throw new HttpException("Invalid credentials", 401);
  if (admin.is_banned) throw new HttpException("Account is banned", 403);
  // 4. Create new session with all required fields from schema
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.economic_board_administrator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        administrator_id: admin.id,
        ip: "",
        expired_at: toISOStringSafe(accessExpires),
        href: "",
        referrer: "",
        created_at: toISOStringSafe(new Date()),
      },
    });
  // 5. Generate JWT tokens using actor.id and new session_id
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "14d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // 6. Return IAuthorized structure
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name ?? null,
    bio: admin.bio ?? null,
    is_banned: admin.is_banned,
    ban_reason: admin.ban_reason ?? null,
    admin_request_status: admin.admin_request_status,
    admin_request_reason: admin.admin_request_reason ?? null,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    role: "administrator",
    access_token: token.access,
    refresh_token: token.refresh,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  } satisfies IEconomicBoardAdministrator.IAuthorized;
}
