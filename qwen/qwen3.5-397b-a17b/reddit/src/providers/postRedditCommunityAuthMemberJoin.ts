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

export async function postRedditCommunityAuthMemberJoin(props: {
  ip: string;
  body: IRedditCommunityMember.IJoin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  const existingEmail =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  const existingUsername =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const memberId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.username,
      bio: null,
      avatar: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const verificationToken: string & tags.Format<"uuid"> = v4();
  const expiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.reddit_community_member_email_verifications.create({
    data: {
      id: v4(),
      reddit_community_member_id: memberId,
      token: verificationToken,
      expires_at: expiresAt,
      verified_at: null,
      created_at: now,
      updated_at: now,
    },
  });
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_member_sessions.create({
    data: {
      id: sessionId,
      reddit_community_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresAt,
    },
  });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar: member.avatar,
    karma: member.karma,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
