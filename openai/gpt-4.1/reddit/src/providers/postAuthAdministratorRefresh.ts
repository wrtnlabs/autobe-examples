import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdministratorRefresh(props: {
  body: ICommunityPlatformAdministrator.IRefresh;
}): Promise<ICommunityPlatformAdministrator.IAuthorized> {
  const refreshToken = props.body.refresh_token;
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch {
    throw new HttpException("Invalid or expired refresh token.", 401);
  }
  if (decoded.type !== "administrator") {
    throw new HttpException("Invalid token type.", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_administrator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_administrator_id: decoded.id,
      },
      include: {
        administrator: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked.", 401);
  }
  const administrator = session.administrator;
  if (!administrator) {
    throw new HttpException("Administrator not found.", 404);
  }
  if (administrator.status !== "active") {
    throw new HttpException("Account is not active.", 403);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const authorizationToken: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  await MyGlobal.prisma.community_platform_administrator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    status: administrator.status,
    business_status:
      typeof administrator.business_status === "undefined"
        ? undefined
        : administrator.business_status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at:
      typeof administrator.deleted_at === "undefined"
        ? undefined
        : administrator.deleted_at === null
          ? null
          : toISOStringSafe(administrator.deleted_at),
    token: authorizationToken,
  };
}
