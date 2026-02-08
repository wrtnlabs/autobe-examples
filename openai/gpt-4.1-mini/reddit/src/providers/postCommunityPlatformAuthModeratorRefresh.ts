import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function postCommunityPlatformAuthModeratorRefresh(props: {
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const { body } = props;
  if (!("refreshToken" in body)) {
    throw new HttpException("Refresh token is required", 400);
  }
  const refreshToken = (
    body as unknown as {
      refreshToken: string;
    }
  ).refreshToken;
  type DecodedToken = {
    type: string;
    id: string;
    session_id: string;
    iat?: number;
    exp?: number;
  };
  let decodedRaw: string | object | undefined = undefined;
  try {
    decodedRaw = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decodedRaw !== "object" || decodedRaw === null) {
    throw new HttpException("Invalid token payload", 401);
  }
  const decoded = decodedRaw as DecodedToken;
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_moderator_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshTokenNew = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_platform_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    token: {
      access: accessToken,
      refresh: refreshTokenNew,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  };
}
