import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthAdminLogin(props: {
  ip: string;
  body: IMultiUserTodoAdmin.ILogin;
}): Promise<IMultiUserTodoAdmin.IAuthorized> {
  // 1. Find admin with password_hash
  const admin = await MyGlobal.prisma.multi_user_todo_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Calculate expiration times
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 4. Generate JWT tokens first
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date(now).toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create session with actual tokens
  await MyGlobal.prisma.multi_user_todo_admin_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_admin_id: admin.id,
      ip: props.ip,
      href: "", // No href in login body
      referrer: "", // No referrer in login body
      created_at: new Date(now).toISOString(),
      expired_at: accessExpires.toISOString(),
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 6. Transform admin data and return
  const adminData: IMultiUserTodoAdmin = {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    deleted_at: admin.deleted_at?.toISOString() ?? null,
  };
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    ...adminData,
    token,
  } satisfies IMultiUserTodoAdmin.IAuthorized;
}
