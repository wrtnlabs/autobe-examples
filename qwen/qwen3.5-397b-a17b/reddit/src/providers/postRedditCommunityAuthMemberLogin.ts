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

export async function postRedditCommunityAuthMemberLogin(props: {
  ip: string;
  body: IRedditCommunityMember.ILogin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      display_name: true,
      bio: true,
      avatar: true,
      karma: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account deleted", 403);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId: string & tags.Format<"uuid"> = v4();
  const nowIso = toISOStringSafe(now);
  const accessExpiresIso = toISOStringSafe(accessExpires);
  const refreshExpiresIso = toISOStringSafe(refreshExpires);
  const accessPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    created_at: nowIso,
  };
  const refreshPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    tokenType: "refresh",
    created_at: nowIso,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  await MyGlobal.prisma.reddit_community_member_sessions.create({
    data: {
      id: sessionId,
      reddit_community_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatar,
    karma: member.karma,
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
