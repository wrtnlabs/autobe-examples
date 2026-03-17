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

export async function postTodoAppAuthMemberLogin(props: {
  ip: string;
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Validate credentials
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session with JWT tokens
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const memberId = member.id as string & tags.Format<"uuid">;
  const accessPayload = {
    type: "member",
    id: memberId,
    session_id: sessionId,
    created_at: toISOStringSafe(now),
  };
  const refreshPayload = {
    type: "member",
    id: memberId,
    session_id: sessionId,
    tokenType: "refresh",
    created_at: toISOStringSafe(now),
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 4. Return IAuthorized
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
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
  } satisfies ITodoAppMember.IAuthorized;
}
