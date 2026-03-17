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
  // Check email uniqueness
  const existingMember =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingMember !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate member ID and session ID
  const memberId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);
  // Generate timestamps using toISOStringSafe
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updatedAt: string & tags.Format<"date-time"> = createdAt;
  // Create member record
  await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.email.split("@")[0],
      password_hash: hashedPassword,
      created_at: createdAt,
      updated_at: updatedAt,
    },
  });
  // Calculate session expiration times
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Generate JWT tokens
  const accessToken: string = jwt.sign(
    {
      type: "member" as const,
      id: memberId,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member" as const,
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh" as const,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session record
  await MyGlobal.prisma.reddit_community_member_sessions.create({
    data: {
      id: sessionId,
      member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt,
      updated_at: updatedAt,
      expired_at: accessExpires,
    },
  });
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IRedditCommunityMember.IAuthorized;
}
