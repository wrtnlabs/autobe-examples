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
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberLogin(props: {
  ip: string & tags.Format<"uuid">;
  href: string;
  referrer: string;
  body: IRedditPlatformMember.ILogin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Find member with password_hash
  const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...RedditPlatformMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Check email verified
  if (!member.email_verified) {
    throw new HttpException("Email not verified", 401);
  }
  // 4. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4(),
      member_id: member.id,
      ip: props.ip,
      href: props.href,
      referrer: props.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized
  return {
    ...(await RedditPlatformMemberTransformer.transform(member)),
    token,
  } satisfies IRedditPlatformMember.IAuthorized;
}
