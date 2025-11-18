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

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: ITodoListAdmin.IRefresh;
}): Promise<ITodoListAdmin.IAuthorized> {
  // Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch (_) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type (not admin)", 403);
  }

  // Find active session (remove non-existent admin_id from query)
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      expired_at: null,
    },
  });
  if (!session) {
    throw new HttpException("Admin session not found or expired", 401);
  }

  // Find enabled admin profile
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: decoded.id,
      disabled_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin not found or disabled", 403);
  }

  // Prepare new access/refresh token exp datetimes as string
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expired_at = toISOStringSafe(accessExpires);
  const refreshable_until = toISOStringSafe(refreshExpires);

  // Generate new JWT tokens with same session id and payload structure, all fields as strings
  const access = jwt.sign(
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
  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session expiration
  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshable_until },
  });

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    disabled_at:
      admin.disabled_at === null ? null : toISOStringSafe(admin.disabled_at),
    token: {
      access: access,
      refresh: refresh,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
  };
}
