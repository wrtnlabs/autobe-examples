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
  const decoded = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
    created_at: string & tags.Format<"date-time">;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Find and validate session by refresh_token
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      refresh_token: props.body.refresh_token,
      todo_app_member_id: decoded.id,
      deleted_at: null,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or already used", 401);
  }
  // 4. Validate session not expired
  const now = new Date();
  const sessionExpires = new Date(session.expired_at);
  if (sessionExpires <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate member exists and not deleted
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpires,
      updated_at: new Date(),
    },
  });
  // 8. Return authorized member with new tokens
  const result: ITodoAppMember.IAuthorized = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
  return result;
}
