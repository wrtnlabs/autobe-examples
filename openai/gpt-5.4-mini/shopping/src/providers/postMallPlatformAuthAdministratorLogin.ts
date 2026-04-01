import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAuthAdministratorLogin(props: {
  ip: string;
  body: IMallPlatformAdministrator.ILogin;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  const administrator =
    await MyGlobal.prisma.mall_platform_administrators.findFirst({
      where: {
        email: props.body.email,
      },
      select: {
        id: true,
        email: true,
        grade: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (administrator === null)
    throw new HttpException("Invalid credentials", 401);
  if (administrator.status !== "active")
    throw new HttpException("Forbidden", 403);
  if (
    !(await PasswordUtil.verify(
      props.body.password,
      administrator.password_hash,
    ))
  ) {
    throw new HttpException("Invalid credentials", 401);
  }
  const issuedAt = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const accessExpiredAt = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiredAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.mall_platform_administrator_sessions.create({
    data: {
      id: sessionId,
      administrator_id: administrator.id,
      ip: props.ip,
      href: props.ip,
      referrer: props.ip,
      created_at: issuedAt,
      expired_at: refreshExpiredAt,
    },
  });
  return {
    id: administrator.id,
    email: administrator.email,
    grade: administrator.grade,
    status: administrator.status,
    createdAt: administrator.created_at.toISOString(),
    updatedAt: administrator.updated_at.toISOString(),
    deletedAt: administrator.deleted_at?.toISOString() ?? null,
    token: {
      access: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: sessionId,
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "administrator",
          id: administrator.id,
          session_id: sessionId,
          tokenType: "refresh",
          created_at: issuedAt,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
