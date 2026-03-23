import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthAdminJoin(props: {
  ip: string;
  body: ITodoAppAdminSession.IJoin;
}): Promise<ITodoAppAdminSession.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const adminExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const admin = await MyGlobal.prisma.todo_app_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      referrer: props.body.referrer ?? "",
      href: props.body.href ?? "",
      access_token: jwt.sign(
        {
          type: "admin",
          id: admin.id,
          session_id: v4() as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "admin",
          id: admin.id,
          session_id: v4() as string & tags.Format<"uuid">,
          tokenType: "refresh",
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expires_at: toISOStringSafe(adminExpires),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return {
    access: session.access_token,
    refresh: session.refresh_token,
    expired_at: toISOStringSafe(session.expires_at),
    token: {
      access: session.access_token,
      refresh: session.refresh_token,
      expired_at: toISOStringSafe(session.expires_at),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoAppAdminSession.IAuthorized;
}
