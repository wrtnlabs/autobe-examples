import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  let decoded:
    | {
        id: string;
        session_id: string;
        type: "moderator";
      }
    | undefined;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (!decoded || decoded.type !== "moderator") {
    throw new HttpException("Invalid token payload", 403);
  }

  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_moderator_id: decoded.id,
      },
      include: {
        moderator: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (!session.moderator) {
    throw new HttpException("Moderator account not found", 404);
  }
  if (session.moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (session.moderator.status !== "active") {
    throw new HttpException("Moderator account is not active", 403);
  }

  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);

  const accessTokenExpiresAt = toISOStringSafe(accessExpires);
  const refreshTokenExpiresAt = toISOStringSafe(refreshExpires);

  const token = {
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
    expired_at: accessTokenExpiresAt,
    refreshable_until: refreshTokenExpiresAt,
  };

  await MyGlobal.prisma.community_platform_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: session.moderator.id,
    email: session.moderator.email,
    status: session.moderator.status,
    business_status:
      typeof session.moderator.business_status !== "undefined"
        ? session.moderator.business_status
        : undefined,
    created_at: toISOStringSafe(session.moderator.created_at),
    updated_at: toISOStringSafe(session.moderator.updated_at),
    deleted_at:
      typeof session.moderator.deleted_at === "object" &&
      session.moderator.deleted_at !== null
        ? toISOStringSafe(session.moderator.deleted_at)
        : session.moderator.deleted_at === null
          ? null
          : undefined,
    token,
  };
}
