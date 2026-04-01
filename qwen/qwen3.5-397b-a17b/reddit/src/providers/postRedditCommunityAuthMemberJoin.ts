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
  const existing = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const memberId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: sessionId,
        reddit_community_member_id: member.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  const verificationToken = v4();
  await MyGlobal.prisma.reddit_community_member_email_verifications.create({
    data: {
      id: v4(),
      reddit_community_member_id: member.id,
      token: verificationToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: member.id,
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
