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

export async function postAuthAdminLogin(props: {
  body: ITodoListAdmin.ILogin;
}): Promise<ITodoListAdmin.IAuthorized> {
  // Phase 1: Validate administrator credentials
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { email: props.body.email },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 3: Create new admin session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await MyGlobal.prisma.todo_list_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_admin_id: admin.id,
      ip: props.body.ip ?? "unknown",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: null,
    },
  });

  // Phase 4: Generate JWT tokens
  const currentTime = toISOStringSafe(now);

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: currentTime,
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
        created_at: currentTime,
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

  // Phase 5: Return authenticated admin response
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  };
}
