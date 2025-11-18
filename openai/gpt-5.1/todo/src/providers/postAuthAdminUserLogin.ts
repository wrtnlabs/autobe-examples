import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserLogin(props: {
  body: ITodoAppAdminUser.ILogin;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  const email = props.body.email;

  const admin = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: { email },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (admin.status !== "active") {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowMs = Date.now();
  const accessExpireMs = nowMs + 60 * 60 * 1000;
  const refreshExpireMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  const createdAtIso = toISOStringSafe(new Date(nowMs));
  const accessExpiredAtIso = toISOStringSafe(new Date(accessExpireMs));
  const refreshExpiredAtIso = toISOStringSafe(new Date(refreshExpireMs));

  const ipValue =
    props.body.ip !== undefined && props.body.ip !== null ? props.body.ip : "";

  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.create({
    data: {
      id: v4(),
      todo_app_adminuser_id: admin.id,
      ip: ipValue,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAtIso,
      expired_at: null,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "adminUser",
      id: admin.id,
      session_id: session.id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "adminUser",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAtIso,
    refreshable_until: refreshExpiredAtIso,
  };

  const createdAtAdminIso = toISOStringSafe(admin.created_at);
  const updatedAtAdminIso = toISOStringSafe(admin.updated_at);

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name === null ? null : admin.display_name,
    status: admin.status,
    created_at: createdAtAdminIso,
    updated_at: updatedAtAdminIso,
    token,
  };
}
