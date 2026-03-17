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

export async function postRedditPlatformAuthMemberLogin(props: {
  body: IRedditPlatformMember.ILogin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      username: true,
      email: true,
      display_name: true,
      bio: true,
      avatar_file_id: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
      deleted_at: true,
      avatarFile: {
        select: {
          file_path: true,
        },
      },
    },
  });
  // 2. Check if member exists and is not deleted
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Verify password using bcrypt comparison
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate JWT tokens first
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4() as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4() as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create new session with tokens
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: sessionId,
      reddit_platform_member_id: member.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 6. Build token response
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // 7. Return IAuthorized response
  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatarFile?.file_path as
      | (string & tags.Format<"url">)
      | null,
    karma_score: member.karma_score,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    email: member.email,
    accessToken: token.access,
    expiresAt: token.expired_at,
    token: token,
  } satisfies IRedditPlatformMember.IAuthorized;
}
