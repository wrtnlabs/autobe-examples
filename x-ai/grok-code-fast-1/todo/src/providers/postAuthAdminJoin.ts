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
import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

export async function postAuthAdminJoin(props: {
  body: ITodoListAdmin.ICreate;
}): Promise<ITodoListAdmin.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Admin email already exists", 409);
  }

  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const id = v4();

  const admin = await MyGlobal.prisma.todo_list_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const sessionData: any = {
    id: v4(),
    todo_list_admin_id: admin.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: toISOStringSafe(accessExpires),
  };
  if (props.body.ip !== undefined && props.body.ip !== null) {
    sessionData.ip = props.body.ip satisfies string as string;
  }

  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: sessionData,
  });

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
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  const sessionSummary: ITodoListAdminSession.ISummary = {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at:
      admin.created_at instanceof Date
        ? toISOStringSafe(admin.created_at)
        : admin.created_at,
    updated_at:
      admin.updated_at instanceof Date
        ? toISOStringSafe(admin.updated_at)
        : admin.updated_at,
  };

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at:
      admin.created_at instanceof Date
        ? toISOStringSafe(admin.created_at)
        : admin.created_at,
    updated_at:
      admin.updated_at instanceof Date
        ? toISOStringSafe(admin.updated_at)
        : admin.updated_at,
    deleted_at:
      admin.deleted_at !== undefined && admin.deleted_at !== null
        ? admin.deleted_at instanceof Date
          ? toISOStringSafe(admin.deleted_at)
          : admin.deleted_at
        : undefined,
    token,
    session: sessionSummary,
  };
}
