import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: ITodoAppAdmin.ICreate;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.todo_app_admin.findFirst({
    where: { email: props.body.email },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = new Date();
  const accessExpiresDate = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiredAtStr = toISOStringSafe(accessExpiresDate) as string &
    tags.Format<"date-time">;
  const refreshExpiredAtStr = toISOStringSafe(refreshExpiresDate) as string &
    tags.Format<"date-time">;

  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.todo_app_admin_session.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      ip: "0.0.0.0",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: accessExpiredAtStr,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? undefined : toISOStringSafe(admin.deleted_at),
    last_active_at:
      admin.last_active_at === null
        ? undefined
        : toISOStringSafe(admin.last_active_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAtStr,
      refreshable_until: refreshExpiredAtStr,
    },
  };
}
