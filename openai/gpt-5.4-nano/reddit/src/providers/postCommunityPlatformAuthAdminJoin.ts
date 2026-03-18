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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminJoin(props: {
  ip: string;
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const normalizedEmail = props.body.email.trim().toLowerCase();
  const existing = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: normalizedEmail, deleted_at: null },
    select: { id: true },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const accessExpiresDate = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntilDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshableUntilIso = toISOStringSafe(refreshableUntilDate);
  const adminUuid = v4();
  const sessionUuid = v4();
  const admin = await MyGlobal.prisma.$transaction(async (tx) => {
    const passwordHash = await PasswordUtil.hash(props.body.password);
    const createdAdmin = await tx.community_platform_admins.create({
      data: {
        id: adminUuid,
        email: normalizedEmail,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const session = await tx.community_platform_admin_sessions.create({
      data: {
        id: sessionUuid,
        admin_id: createdAdmin.id,
        ip: props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        updated_at: now,
        expired_at: accessExpiresDate,
        deleted_at: null,
      },
      select: { id: true },
    });
    const accessPayload = {
      type: typia.assert<"admin">("admin"),
      id: createdAdmin.id,
      session_id: session.id,
      created_at: nowIso,
    } as const;
    const refreshPayload = {
      type: typia.assert<"admin">("admin"),
      id: createdAdmin.id,
      session_id: session.id,
      tokenType: typia.assert<"refresh">("refresh"),
      created_at: nowIso,
    } as const;
    const token: IAuthorizationToken = {
      access: jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
        expiresIn: "1h",
        issuer: "autobe",
      }),
      refresh: jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
        expiresIn: "7d",
        issuer: "autobe",
      }),
      expired_at: accessExpiresIso,
      refreshable_until: refreshableUntilIso,
    };
    return { createdAdmin, token };
  });
  return {
    id: admin.createdAdmin.id,
    email: admin.createdAdmin.email,
    created_at: toISOStringSafe(admin.createdAdmin.created_at),
    updated_at: toISOStringSafe(admin.createdAdmin.updated_at),
    deleted_at: admin.createdAdmin.deleted_at
      ? toISOStringSafe(admin.createdAdmin.deleted_at)
      : null,
    token: admin.token,
  };
}
