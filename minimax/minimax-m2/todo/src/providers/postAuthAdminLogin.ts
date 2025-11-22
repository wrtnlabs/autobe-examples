import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: ITodoAppAdministrator.ILogin;
}): Promise<ITodoAppAdministrator.IAuthorized> {
  // Phase 1: Validate administrator credentials
  const admin = await MyGlobal.prisma.todo_app_administrators.findFirst({
    where: { email: props.body.email },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if account is active and not deleted
  if (admin.status !== "active" || admin.deleted_at !== null) {
    throw new HttpException("Account is inactive or deactivated", 403);
  }

  // Verify password using PasswordUtil
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Create new session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await MyGlobal.prisma.todo_app_administrator_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      administrator_id: admin.id,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Phase 3: Generate JWT tokens
  const currentTimestamp = new Date().toISOString();

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: currentTimestamp,
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
        created_at: currentTimestamp,
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

  // Return authenticated administrator information
  return {
    id: admin.id,
    token,
  };
}
