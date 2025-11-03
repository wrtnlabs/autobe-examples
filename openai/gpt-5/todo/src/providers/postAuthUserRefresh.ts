import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoUser.IRefresh;
}): Promise<ITodoUser.IAuthorized> {
  const { body } = props;

  // Phase 1: Verify refresh token
  let decoded: { id: string; session_id: string; type: string } | null = null;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch (_err) {
    const now = toISOStringSafe(new Date());
    // Audit: failed refresh attempt (token invalid)
    try {
      await MyGlobal.prisma.todo_audit_events.create({
        data: {
          id: v4(),
          actor_type: "user",
          category: "auth",
          action: "refresh",
          success: false,
          message: "Invalid or expired refresh token",
          created_at: now,
          updated_at: now,
        },
      });
    } catch (_) {
      // Swallow audit logging errors to not mask the primary auth error
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Business validation: token type must be user
  if (decoded.type !== "user") {
    const now = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.todo_audit_events.create({
        data: {
          id: v4(),
          actor_type: "user",
          category: "auth",
          action: "refresh",
          success: false,
          message: "Invalid token actor type",
          created_at: now,
          updated_at: now,
        },
      });
    } catch (_) {}
    throw new HttpException("Forbidden", 403);
  }

  // Validate session and actor
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_user_id: decoded.id,
    },
    include: { user: true },
  });
  if (!session) {
    const now = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.todo_audit_events.create({
        data: {
          id: v4(),
          actor_type: "user",
          category: "auth",
          action: "refresh",
          success: false,
          message: "Session not found or revoked",
          created_at: now,
          updated_at: now,
        },
      });
    } catch (_) {}
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at !== null) {
    const now = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.todo_audit_events.create({
        data: {
          id: v4(),
          actor_type: "user",
          category: "auth",
          action: "refresh",
          success: false,
          todo_user_id: session.todo_user_id,
          todo_user_session_id: session.id,
          message: "Session already expired",
          created_at: now,
          updated_at: now,
        },
      });
    } catch (_) {}
    throw new HttpException("Session expired or revoked", 401);
  }

  // Phase 2: Generate new tokens (reuse same session_id)
  const nowIso = toISOStringSafe(new Date());
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Phase 3: Update session expiration to refresh window end
  await MyGlobal.prisma.todo_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpiredAt,
    },
  });

  // Audit: success
  const auditNow = toISOStringSafe(new Date());
  try {
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4(),
        todo_user_id: session.todo_user_id,
        todo_user_session_id: session.id,
        actor_type: "user",
        category: "auth",
        action: "refresh",
        success: true,
        created_at: auditNow,
        updated_at: auditNow,
      },
    });
  } catch (_) {}

  // Build response
  const user = session.user;
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    user: {
      id: user.id as string & tags.Format<"uuid">,
      email: user.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    },
  };
}
