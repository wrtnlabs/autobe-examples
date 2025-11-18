import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserRefresh(props: {
  body: ITodoAppMemberUserRefresh.ICreate;
}): Promise<ITodoAppMemberUser.IAuthorized> {
  // Step 1: verify and decode refresh token
  let decoded: any;

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Ensure token has expected shape and actor type
  const decodedId = decoded && decoded.id;
  const decodedSessionId = decoded && decoded.session_id;
  const decodedType = decoded && decoded.type;

  if (typeof decodedId !== "string" || typeof decodedSessionId !== "string") {
    throw new HttpException("Malformed refresh token payload", 401);
  }

  if (decodedType !== "memberuser") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 2: load member user from DB
  const member = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: {
      id: decodedId,
    },
  });

  if (!member) {
    throw new HttpException("Member not found for refresh token", 401);
  }

  // Enforce acceptable status (only "active" is allowed)
  if (member.status !== "active") {
    throw new HttpException("Account status does not allow refresh", 403);
  }

  // Step 3: determine and validate session id
  const effectiveSessionId =
    props.body.session_id !== undefined
      ? props.body.session_id
      : decodedSessionId;

  if (effectiveSessionId !== decodedSessionId) {
    throw new HttpException("Session mismatch for refresh token", 401);
  }

  // Step 4: load session and validate it is active
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: effectiveSessionId,
      todo_app_memberuser_id: decodedId,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const nowMs = Date.now();
  if (session.expired_at !== null) {
    const expiredAtMs = session.expired_at.getTime();
    if (expiredAtMs <= nowMs) {
      throw new HttpException("Session has been expired", 401);
    }
  }

  // Step 5: generate new access and refresh tokens using same session
  const accessExpiresMs = nowMs + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMs));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMs));

  const accessToken = jwt.sign(
    {
      type: decodedType,
      id: decodedId,
      session_id: decodedSessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decodedType,
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: update session expiration and metadata
  await MyGlobal.prisma.todo_app_memberuser_sessions.update({
    where: {
      id: decodedSessionId,
    },
    data: {
      expired_at: new Date(refreshExpiresMs),
      ...(props.body.ip !== undefined && {
        ip: props.body.ip,
      }),
      ...(props.body.href !== undefined && {
        href: props.body.href,
      }),
      ...(props.body.referrer !== undefined && {
        referrer: props.body.referrer,
      }),
    },
  });

  // Step 7: build response DTO
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name === null ? null : member.display_name,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
