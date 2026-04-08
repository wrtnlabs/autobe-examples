import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMember.IRefresh;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Verify refresh token
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  // Type guard for JWT payload
  function isValidPayload(payload: unknown): payload is {
    id: string;
    session_id: string;
    type: string;
  } {
    return (
      typeof payload === "object" &&
      payload !== null &&
      "id" in payload &&
      typeof (payload as Record<string, unknown>).id === "string" &&
      "session_id" in payload &&
      typeof (payload as Record<string, unknown>).session_id === "string" &&
      "type" in payload &&
      typeof (payload as Record<string, unknown>).type === "string"
    );
  }
  if (!isValidPayload(decoded)) {
    throw new HttpException("Invalid token format", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      id: decoded.session_id,
      todo_app_member_id: decoded.id,
      expired_at: { gt: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member is not deleted
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  // 7. Return authorized response
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
