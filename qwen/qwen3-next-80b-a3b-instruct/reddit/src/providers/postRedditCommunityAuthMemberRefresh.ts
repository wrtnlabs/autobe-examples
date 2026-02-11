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
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and active
  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_member_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member not deleted
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (reuse same session_id)
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
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
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
