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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserRefresh(props: {
  user: UserPayload;
  body: ICommunityPlatformUser.IRefresh;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "user" };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "user" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Token does not match user role", 403);
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
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (session.user.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now = toISOStringSafe(new Date());

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  await MyGlobal.prisma.community_platform_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiredAt },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    status: session.user.status,
    business_status: session.user.business_status ?? undefined,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at:
      session.user.deleted_at !== null
        ? toISOStringSafe(session.user.deleted_at)
        : undefined,
    token,
  };
}
