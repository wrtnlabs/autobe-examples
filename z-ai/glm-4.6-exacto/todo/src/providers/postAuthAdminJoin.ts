import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

export async function postAuthAdminJoin(props: {
  body: ITodoAppAdmin.IJoin;
}): Promise<ITodoAppAdmin.IAuthorized> {
  // 1. Check for duplicate admin email
  const existing = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered as admin", 409);
  }

  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // 3. Prepare timestamps and IDs
  const now: string = toISOStringSafe(new Date());
  const id: string = v4();
  const session_id: string = v4();
  const accessExpiredAt: string = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt: string = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // 4. Insert admin
  const admin = await MyGlobal.prisma.todo_app_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Create session
  const ipValue =
    props.body.ip === undefined || props.body.ip === null ? "" : props.body.ip;
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: session_id,
      admin_id: admin.id,
      ip: ipValue,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });

  // 6. Build session DTO summary
  const sessionSummary = {
    id: session.id,
    admin_id: session.admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
  };

  // 7. Generate tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
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
        type: "admin",
        id: admin.id,
        session_id: session.id,
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
    refreshable_until: refreshExpiredAt,
  };

  // 8. Return authorized admin DTO
  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    token,
    session: sessionSummary,
  };
}
