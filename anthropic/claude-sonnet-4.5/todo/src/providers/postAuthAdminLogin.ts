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

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // 1. Find admin record by email (case-insensitive, not disabled)
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
      disabled_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const valid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create session
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionData: any = {
    id: sessionId,
    todo_list_admin_id: admin.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: accessExpiresAt,
  };
  if (props.body.ip !== undefined) sessionData.ip = props.body.ip;
  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: sessionData,
  });

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    disabled_at:
      admin.disabled_at === null ? null : toISOStringSafe(admin.disabled_at),
    token,
  };
}
