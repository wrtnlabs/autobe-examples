import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberRefresh(props: {
  body: IRedditPlatformMember.IRefresh;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: "member";
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      type: "member";
      id: string;
      session_id: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_platform_member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const now = new Date();
  if (new Date(session.expired_at) < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Validate member exists and not deleted
  const member = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: decoded.id },
    include: {
      avatarFile: true,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpires,
    },
  });
  // 7. Return member profile with tokens
  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatarFile?.file_path as
      | (string & tags.Format<"url">)
      | null,
    karma_score: member.karma_score as number & tags.Type<"int32">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    email: member.email as string & tags.Format<"email">,
    accessToken,
    expiresAt: toISOStringSafe(accessExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies IRedditPlatformMember.IAuthorized;
}
