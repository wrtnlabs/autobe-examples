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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.IRefresh;
}): Promise<ITodoAppAdmin.IAuthorized> {
  const { admin, body } = props;

  // Verify and decode refresh token
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session and admin state
  const session = await MyGlobal.prisma.todo_app_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_admin_id: decoded.id,
    },
    include: { admin: true },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const targetAdmin = session.admin;
  if (!targetAdmin) throw new HttpException("Admin account not found", 401);
  if (!targetAdmin.is_active)
    throw new HttpException("Account is not active", 403);
  if (targetAdmin.deleted_at !== null)
    throw new HttpException("Account has been deleted", 403);

  // Generate tokens and timestamps
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = toISOStringSafe(new Date());

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const accessExpiredAt = toISOStringSafe(accessExpires);
  const refreshableUntil = toISOStringSafe(refreshExpires);

  // Update session expiration time
  await MyGlobal.prisma.todo_app_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshableUntil },
  });

  // Record audit log for token refresh
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_admin_id: decoded.id,
      todo_app_admin_session_id: decoded.session_id,
      event_type: "refresh_token",
      details: "Admin refresh token exchange",
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  // Return authorized admin payload
  return {
    id: targetAdmin.id as string & tags.Format<"uuid">,
    email: targetAdmin.email as string & tags.Format<"email">,
    display_name: targetAdmin.display_name ?? null,
    role: targetAdmin.role,
    is_active: targetAdmin.is_active,
    createdAt: toISOStringSafe(targetAdmin.created_at),
    updatedAt: toISOStringSafe(targetAdmin.updated_at),
    deletedAt: targetAdmin.deleted_at
      ? toISOStringSafe(targetAdmin.deleted_at)
      : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
