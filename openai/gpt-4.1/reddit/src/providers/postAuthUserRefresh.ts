import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ICommunityPlatformUser.IRefresh;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_user_id: decoded.id,
      },
      include: {
        user: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (
    session.expired_at &&
    new Date(session.expired_at).getTime() < Date.now()
  ) {
    throw new HttpException("Session expired", 401);
  }
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const nowMillis = Date.now();
  const accessExpiresMillis = nowMillis + 60 * 60 * 1000;
  const refreshExpiresMillis = nowMillis + 7 * 24 * 60 * 60 * 1000;
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresMillis)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresMillis)),
  };
  await MyGlobal.prisma.community_platform_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      ip: props.body.ip ?? session.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: toISOStringSafe(new Date(refreshExpiresMillis)),
    },
  });
  return {
    id: session.user.id,
    email: session.user.email,
    display_name: session.user.display_name,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at: session.user.deleted_at
      ? toISOStringSafe(session.user.deleted_at)
      : null,
    token,
  };
}
