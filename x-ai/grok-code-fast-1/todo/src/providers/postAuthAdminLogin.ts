import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

export async function postAuthAdminLogin(props: {
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // Step 1: Find admin by email (must not be soft-deleted)
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Step 2: Password verification
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Step 3: Create session
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: sessionId,
      todo_list_admin_id: admin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // Step 4: Session summary uses session values
  const sessionSummary: ITodoListAdminSession.ISummary = {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  };
  // Step 5: Generate JWT tokens
  const token: IAuthorizationToken = {
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Step 6: Build response (respect deleted_at is optional+nullable)
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token,
    session: sessionSummary,
  };
}
