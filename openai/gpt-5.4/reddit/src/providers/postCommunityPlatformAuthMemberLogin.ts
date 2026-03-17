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
import { CommunityPlatformProfileTransformer } from "../transformers/CommunityPlatformProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberLogin(props: {
  ip: string;
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      code: true,
      email: true,
      email_verified: true,
      status: true,
      last_signed_in_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
      profile: CommunityPlatformProfileTransformer.select(),
    },
  });
  if (
    member === null ||
    member.deleted_at !== null ||
    member.status === "suspended" ||
    member.status === "deleted"
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  const verified = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (verified === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date().toISOString();
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshableUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId = v4();
  const refreshed = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_member_sessions.create({
      data: {
        id: sessionId,
        community_platform_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: refreshableUntil,
      },
    });
    await tx.community_platform_members.update({
      where: {
        id: member.id,
      },
      data: {
        last_signed_in_at: now,
      },
    });
    return tx.community_platform_members.findUniqueOrThrow({
      where: {
        id: member.id,
      },
      ...CommunityPlatformMemberTransformer.select(),
    });
  });
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: refreshed.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: refreshed.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  } satisfies IAuthorizationToken;
  return {
    ...(await CommunityPlatformMemberTransformer.transform(refreshed)),
    token,
  };
}
