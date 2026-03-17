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
  // 1. Check email uniqueness
  const existing = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const memberId: string & tags.Format<"uuid"> = v4();
  const member = await MyGlobal.prisma.multi_user_todo_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      name: props.body.name,
      nickname: props.body.nickname ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Create session record
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: toISOStringSafe(accessExpires),
    },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      expired_at: true,
    },
  });
  // 5. Create email verification token
  const verificationId: string & tags.Format<"uuid"> = v4();
  const verificationToken: string & tags.Format<"uuid"> = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.multi_user_todo_member_email_verifications.create({
    data: {
      id: verificationId,
      multi_user_todo_member_id: member.id,
      token: verificationToken,
      email: props.body.email,
      purpose: "registration",
      expires_at: toISOStringSafe(expiresAt),
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    nickname: member.nickname,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
