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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const existing = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  const now = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  const verificationExpiredAt = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  );
  const accessExpiredAt = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );
  const refreshableUntil = typia.assert<string & tags.Format<"date-time">>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
  const memberId = typia.assert<string & tags.Format<"uuid">>(v4());
  const verificationId = typia.assert<string & tags.Format<"uuid">>(v4());
  const sessionId = typia.assert<string & tags.Format<"uuid">>(v4());
  const memberCode = v4().replaceAll("-", "");
  const verificationToken = v4();
  const member = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_platform_members.create({
      data: {
        id: memberId,
        code: memberCode,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        email_verified: false,
        status: "active",
        last_signed_in_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
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
      },
    });
    await tx.community_platform_member_email_verifications.create({
      data: {
        id: verificationId,
        community_platform_member_id: created.id,
        token: verificationToken,
        status: "pending",
        verified_at: null,
        expired_at: verificationExpiredAt,
        invalidated_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return created;
  });
  await MyGlobal.prisma.community_platform_member_sessions.create({
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
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
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
        id: member.id,
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
  };
  return {
    id: member.id,
    code: member.code,
    email: member.email,
    emailVerified: member.email_verified,
    status: member.status,
    lastSignedInAt:
      member.last_signed_in_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            member.last_signed_in_at.toISOString(),
          ),
    createdAt: typia.assert<string & tags.Format<"date-time">>(
      member.created_at.toISOString(),
    ),
    updatedAt: typia.assert<string & tags.Format<"date-time">>(
      member.updated_at.toISOString(),
    ),
    deletedAt:
      member.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            member.deleted_at.toISOString(),
          ),
    profile: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      display_name: member.code,
      bio: null,
      member: {},
      files: [],
      karma: 0,
      posts: [],
      comments: {},
      created_at: typia.assert<string & tags.Format<"date-time">>(
        member.created_at.toISOString(),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        member.updated_at.toISOString(),
      ),
      deleted_at: null,
    },
    token,
  };
}
