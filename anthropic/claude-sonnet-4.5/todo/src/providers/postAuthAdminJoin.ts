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

export async function postAuthAdminJoin(props: {
  body: ITodoListAdmin.ICreate;
}): Promise<ITodoListAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const adminId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const admin = await MyGlobal.prisma.todo_list_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessExpiresMs: number = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs: number = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresMs),
  );
  const refreshExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresMs),
  );

  const sessionId: string & tags.Format<"uuid"> = v4();
  const sessionCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: sessionId,
      todo_list_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: sessionCreatedAt,
      expired_at: accessExpiredAt,
    },
  });

  const tokenCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
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
        id: admin.id,
        session_id: session.id,
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
    refreshable_until: refreshExpiredAt,
  };

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token,
  };
}
