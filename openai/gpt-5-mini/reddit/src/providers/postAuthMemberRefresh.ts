import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberRefresh(props: {
  body: ICommunityPortalMember.IRefresh;
}): Promise<ICommunityPortalMember.IAuthorized> {
  const { body } = props;
  const { refreshToken } = body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const payload: any = decoded as any;
  const userId = payload && (payload.userId || payload.sub || payload.id);
  if (!userId) throw new HttpException("Invalid refresh token", 401);

  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Unauthorized", 401);
  if (user.deleted_at) throw new HttpException("Unauthorized", 401);

  const member = await MyGlobal.prisma.community_portal_members.findUnique({
    where: { user_id: user.id },
  });
  if (!member) throw new HttpException("Unauthorized", 401);
  if (member.is_suspended)
    throw new HttpException("Unauthorized: account suspended", 403);

  const accessToken = jwt.sign(
    { id: user.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const rotatedRefreshToken = jwt.sign(
    { userId: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name ?? null,
    karma: user.karma,
    avatar_uri: user.avatar_uri ?? null,
    created_at: toISOStringSafe(user.created_at),
    token: {
      access: accessToken,
      refresh: rotatedRefreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
