import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthMemberRefresh(props: {
  body: IMultiUserTodoMember.IRefresh;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  // Validate refresh token is not empty
  if (
    !props.body.refresh_token ||
    props.body.refresh_token.trim().length === 0
  ) {
    throw new HttpException("Refresh token is required", 400);
  }
  // 1. Verify refresh token
  const decoded = typia.assert<{
    id: string;
    session_id: string;
    type: "member";
    created_at: string;
  }>(
    jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }),
  );
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_member_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Check session not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Validate member account not deleted
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires, updated_at: new Date() },
  });
  // 7. Return authorized response
  return {
    id: typia.assert<string>(member.id),
    email: typia.assert<string>(member.email),
    name: member.name,
    nickname: member.nickname ?? undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IMultiUserTodoMember.IAuthorized;
}
