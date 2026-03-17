import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthMemberRefresh(props: {
  body: IRedditCommunityMember.IRefresh;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const { refreshToken } = props.body;
  // 1. Verify refresh token
  const decoded: {
    type: "member";
    id: string;
    session_id: string & tags.Format<"uuid">;
    created_at: string;
  } = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as typeof decoded;
  // 2. Validate session exists and belongs to this member
  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Check session not deleted
  if (session.deleted_at !== null) {
    throw new HttpException("Session has been revoked", 401);
  }
  // 4. Check session not expired
  const expiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    session.expired_at,
  );
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (expiredAt <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate member not deleted
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Calculate new expiration times as ISO strings
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 7. Generate new tokens
  const newAccessToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpires),
    },
  });
  return {
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
