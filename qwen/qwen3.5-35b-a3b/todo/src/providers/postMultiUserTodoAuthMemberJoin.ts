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

export async function postMultiUserTodoAuthMemberJoin(props: {
  ip: string;
  body: IMultiUserTodoMember.IJoin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member record with hashed password
  const member = await MyGlobal.prisma.multi_user_todo_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create initial session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      multi_user_todo_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
    select: {
      id: true,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member" as const,
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member" as const,
        id: member.id,
        session_id: session.id,
        tokenType: "refresh" as const,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at:
      member.deleted_at === null ? null : member.deleted_at.toISOString(),
    token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
