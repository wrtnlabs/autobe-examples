import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decoded === "string") {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  if (
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.type !== "string" ||
    typeof decoded.created_at !== "string"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_member_id: decoded.id,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        expired_at: true,
        member: {
          select: CommunityPlatformMemberTransformer.select().select,
        },
      } satisfies Prisma.community_platform_member_sessionsSelect,
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (session.member.status !== "active") {
    throw new HttpException("Account is not eligible for refresh", 403);
  }
  const now: number = Date.now();
  const accessExpiredAtMs: number = now + 60 * 60 * 1000;
  const refreshableUntilMs: number = now + 7 * 24 * 60 * 60 * 1000;
  const createdAt: string = toISOStringSafe(new Date(now));
  const accessExpiredAt: string = toISOStringSafe(new Date(accessExpiredAtMs));
  const refreshableUntil: string = toISOStringSafe(
    new Date(refreshableUntilMs),
  );
  const access: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh: string = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(refreshableUntilMs),
    },
  });
  const member: ICommunityPlatformMember =
    await CommunityPlatformMemberTransformer.transform(session.member);
  return {
    ...member,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
