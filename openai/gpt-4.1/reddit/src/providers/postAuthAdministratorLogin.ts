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

export async function postAuthAdministratorLogin(props: {
  body: ICommunityPlatformAdministrator.ILogin;
}): Promise<ICommunityPlatformAdministrator.IAuthorized> {
  const { email, password, ip, href, referrer } = props.body;
  const administrator =
    await MyGlobal.prisma.community_platform_administrators.findUnique({
      where: { email },
    });
  if (!administrator || administrator.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (administrator.status !== "active") {
    throw new HttpException("Administrator account is not active", 403);
  }
  const passwordValid = await PasswordUtil.verify(
    password,
    administrator.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const sessionId = v4();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const data: any = {
    id: sessionId,
    community_platform_administrator_id: administrator.id,
    href,
    referrer,
    created_at: toISOStringSafe(now),
    expired_at: toISOStringSafe(accessExpires),
  };
  if (typeof ip === "string") {
    data.ip = ip;
  }
  const session =
    await MyGlobal.prisma.community_platform_administrator_sessions.create({
      data,
    });
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: administrator.id,
    email: administrator.email,
    status: administrator.status,
    business_status:
      administrator.business_status === null
        ? undefined
        : administrator.business_status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at:
      administrator.deleted_at === null
        ? undefined
        : toISOStringSafe(administrator.deleted_at),
    token,
  };
}
