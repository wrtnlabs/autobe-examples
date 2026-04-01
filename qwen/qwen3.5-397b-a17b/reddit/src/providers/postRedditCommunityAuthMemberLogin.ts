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
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const memberId = member.id;
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: sessionId,
        reddit_community_member_id: memberId,
        access_token: jwt.sign(
          {
            type: "member",
            id: memberId,
            session_id: sessionId,
            created_at: new Date().toISOString(),
          },
          MyGlobal.env.JWT_SECRET_KEY,
          { expiresIn: "15m", issuer: "autobe" },
        ),
        refresh_token: jwt.sign(
          {
            type: "member",
            id: memberId,
            session_id: sessionId,
            tokenType: "refresh",
            created_at: new Date().toISOString(),
          },
          MyGlobal.env.JWT_SECRET_KEY,
          { expiresIn: "7d", issuer: "autobe" },
        ),
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  const token: IAuthorizationToken = {
    access: session.access_token,
    refresh: session.refresh_token,
    expired_at: toISOStringSafe(session.expired_at),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: memberId,
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
}
