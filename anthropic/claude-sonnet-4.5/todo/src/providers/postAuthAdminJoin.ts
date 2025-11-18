import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IJoin;
}): Promise<ITodoListAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException(
      "Email is already registered for an administrator account.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const adminId = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const admin = await MyGlobal.prisma.todo_list_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      disabled_at: null,
    },
  });
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: sessionId,
      todo_list_admin_id: admin.id,
      ip:
        props.body.ip != null ? (props.body.ip satisfies string as string) : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const accessToken = jwt.sign(
    { type: "admin", id: admin.id, session_id: session.id, created_at: now },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    disabled_at:
      admin.disabled_at === null ? null : toISOStringSafe(admin.disabled_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
