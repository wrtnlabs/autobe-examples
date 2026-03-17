import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function postEcommerceMallAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceMallAdmin.ILogin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: props.ip,
      href: "",
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        created_at: now.toISOString() as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id as string & tags.Format<"uuid">,
        session_id: session.id as string & tags.Format<"uuid">,
        tokenType: "refresh" as const,
        created_at: now.toISOString() as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    status: admin.status,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
