import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdministratorJoin(props: {
  body: ICommunityPlatformAdministrator.ICreate;
}): Promise<ICommunityPlatformAdministrator.IAuthorized> {
  // Step 1: Check for duplicate admin email
  const existing =
    await MyGlobal.prisma.community_platform_administrators.findFirst({
      where: { email: props.body.email },
    });
  if (existing) {
    throw new HttpException("Administrator email already in use", 409);
  }

  // Step 2: Hash the provided password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const adminId = v4();

  // Step 3: Create admin record
  const created =
    await MyGlobal.prisma.community_platform_administrators.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: hashedPassword,
        status: "active",
        business_status: props.body.business_status ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 4: Create admin session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionCreatedAt = toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.community_platform_administrator_sessions.create({
      data: {
        id: sessionId,
        community_platform_administrator_id: created.id,
        ip: "0.0.0.0",
        href: "-",
        referrer: "-",
        created_at: sessionCreatedAt,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Step 5: JWT token issuance
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        id: created.id,
        session_id: session.id,
        type: "administrator",
        created_at: sessionCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        id: created.id,
        session_id: session.id,
        type: "administrator",
        tokenType: "refresh",
        created_at: sessionCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 6: Return as IAuthorized
  return {
    id: created.id,
    email: created.email,
    status: created.status,
    business_status: created.business_status ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    token,
  };
}
