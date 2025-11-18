import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postAuthMemberUserRefresh(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppMemberUserRefresh.IRequest;
}): Promise<ITodoAppMemberuser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: any;

  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (!decoded || typeof decoded !== "object") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "memberuser") {
    throw new HttpException("Invalid token type", 403);
  }

  if (decoded.tokenType !== "refresh") {
    // Enforce that only refresh tokens can be used here
    throw new HttpException("Invalid token kind for refresh operation", 403);
  }

  // 2. Validate that the session exists and is active
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_memberuser_id: decoded.id,
    },
  });

  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.expired_at !== null) {
    // Session already marked as expired, do not allow refresh
    throw new HttpException("Session expired or revoked", 401);
  }

  // 3. Load the corresponding member user account
  const member = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (member === null) {
    // Avoid leaking account existence vs token validity differences
    throw new HttpException("Session expired or revoked", 401);
  }

  // Business rule: disabled or logically deleted accounts cannot refresh tokens
  if (member.deleted_at !== null || member.status !== "active") {
    throw new HttpException("Account has been disabled or deleted", 403);
  }

  // 4. Generate new tokens (reuse same session_id)
  const nowMs = Date.now();
  const nowIso = toISOStringSafe(new Date(nowMs));

  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMs));

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
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
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  // 5. Update session expiration to align with new refresh token
  await MyGlobal.prisma.todo_app_memberuser_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMs),
    },
  });

  // Optionally, track last authenticated activity by updating member user timestamps
  const updatedMember = await MyGlobal.prisma.todo_app_memberusers.update({
    where: {
      id: member.id,
    },
    data: {
      last_login_at: new Date(nowMs),
      updated_at: new Date(nowMs),
    },
  });

  // 6. Map DB record to ITodoAppMemberuser.IAuthorized
  const displayName =
    updatedMember.display_name === null ? null : updatedMember.display_name;
  const lastLoginAtIso =
    updatedMember.last_login_at === null
      ? null
      : toISOStringSafe(updatedMember.last_login_at);
  const createdAtIso = toISOStringSafe(updatedMember.created_at);
  const updatedAtIso = toISOStringSafe(updatedMember.updated_at);
  const deletedAtIso =
    updatedMember.deleted_at === null
      ? null
      : toISOStringSafe(updatedMember.deleted_at);

  const result: ITodoAppMemberuser.IAuthorized = {
    id: updatedMember.id,
    email: updatedMember.email,
    display_name: displayName,
    status: updatedMember.status,
    failed_login_count: updatedMember.failed_login_count,
    last_login_at: lastLoginAtIso,
    created_at: createdAtIso,
    updated_at: updatedAtIso,
    deleted_at: deletedAtIso,
    token,
  };

  return result;
}
