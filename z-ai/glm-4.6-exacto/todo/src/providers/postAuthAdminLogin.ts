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

export async function postAuthAdminLogin(props: {
  body: ITodoAppAdmin.ILogin;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: {
      email: props.body.email,
    },
  });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Session and tokens (all dates as string & tags.Format<'date-time'>, uuid from v4)
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const accessExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      ip:
        props.body.ip !== null && props.body.ip !== undefined
          ? props.body.ip
          : "", // fallback empty (must be present)
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: nowIso,
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
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null ? toISOStringSafe(admin.deleted_at) : undefined,
    token,
    session: {
      id: session.id,
      admin_id: session.admin_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    },
  };
}
