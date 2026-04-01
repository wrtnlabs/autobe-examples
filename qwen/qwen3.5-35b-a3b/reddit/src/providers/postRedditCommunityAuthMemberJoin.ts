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
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Generate member ID and username
  const memberId: string & tags.Format<"uuid"> = v4();
  const emailLocalPart = props.body.email.split("@")[0];
  const username: string = emailLocalPart;
  // 3. Create member with hashed password
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: username,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 4. Create session
  const sessionId: string & tags.Format<"uuid"> = v4();
  const now = new Date();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const ipAddress: string = props.body.ip ?? props.ip;
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: sessionId,
        member_id: member.id,
        access_token: "", // Will be set after JWT generation
        refresh_token: "", // Will be set after JWT generation
        ip: ipAddress,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    created_at: toISOStringSafe(now),
  };
  const access: string = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refreshPayload = {
    ...tokenPayload,
    tokenType: "refresh",
  };
  const refresh: string = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 6. Update session with tokens
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  // 7. Return IAuthorized
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } satisfies IAuthorizationToken,
  } satisfies IRedditCommunityMember.IAuthorized;
}
