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

export async function postMallPlatformAuthAdministratorJoin(props: {
  ip: string;
  body: IMallPlatformAdministrator.IJoin;
}): Promise<IMallPlatformAdministrator.IAuthorized> {
  const existing = await MyGlobal.prisma.mall_platform_administrators.findFirst(
    {
      where: { email: props.body.email },
      select: { id: true },
    },
  );
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const now = new Date();
  const created = await MyGlobal.prisma.mall_platform_administrators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      grade: "regular",
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.mall_platform_administratorsCreateInput,
    select: {
      id: true,
      email: true,
      grade: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const sessionId = v4();
  const issuedAt = now.toISOString();
  const accessExpiredAt = new Date(
    now.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const refreshableUntil = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "administrator",
        id: created.id,
        session_id: sessionId,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: created.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: created.id,
    email: created.email,
    grade: created.grade,
    status: created.status,
    createdAt: created.created_at.toISOString(),
    updatedAt: created.updated_at.toISOString(),
    deletedAt: created.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IMallPlatformAdministrator.IAuthorized;
}
