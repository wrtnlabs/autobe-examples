import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAdminTransformer } from "../transformers/CommunityPlatformAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminJoin(props: {
  ip: string;
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const verificationExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tokenCreatedAt: string & tags.Format<"date-time"> = now.toISOString();
  const accessExpiredAt: string & tags.Format<"date-time"> =
    accessExpires.toISOString();
  const refreshableUntil: string & tags.Format<"date-time"> =
    refreshExpires.toISOString();
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const adminId: string & tags.Format<"uuid"> = v4();
    const verificationId: string & tags.Format<"uuid"> = v4();
    const sessionId: string & tags.Format<"uuid"> = v4();
    const verificationToken = v4();
    const passwordHash = await PasswordUtil.hash(props.body.password);
    const admin = await prisma.community_platform_admins.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: passwordHash,
        status: "pending",
        email_verified_at: null,
        last_signed_in_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...CommunityPlatformAdminTransformer.select(),
    });
    await prisma.community_platform_admin_email_verifications.create({
      data: {
        id: verificationId,
        token: verificationToken,
        status: "pending",
        verified_at: null,
        expired_at: verificationExpires,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        admin: {
          connect: {
            id: admin.id,
          },
        },
      },
    });
    const session = await prisma.community_platform_admin_sessions.create({
      data: {
        id: sessionId,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
        admin: {
          connect: {
            id: admin.id,
          },
        },
      },
      select: {
        id: true,
      },
    });
    return {
      admin,
      session,
    };
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: created.admin.id,
        session_id: created.session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: created.admin.id,
        session_id: created.session.id,
        tokenType: "refresh",
        created_at: tokenCreatedAt,
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
    ...(await CommunityPlatformAdminTransformer.transform(created.admin)),
    token,
  };
}
