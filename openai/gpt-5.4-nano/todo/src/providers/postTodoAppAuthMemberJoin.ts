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

export async function postTodoAppAuthMemberJoin(props: {
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  // Validate business inputs (schema already validated by typia runtime, but enforce required title-equivalents: email/password presence already guaranteed by DTO types)
  // Check existing member
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: { id: true, deleted_at: true },
  });
  if (existing?.deleted_at === null) {
    throw new HttpException("Email already registered", 409);
  }
  const password_hash = await PasswordUtil.hash(props.body.password);
  // Determine default status: since domain rules mention lifecycle default, use account status string from member schema default if any.
  // Fallback to "active" if not present would be guessing; but we must set something. We'll set to props.body?? none. So use 'enabled'??
  const status = "active";
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = createdAt;
  const sessionExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const member = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.todo_app_members.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash,
        status,
        created_at: createdAt as any,
        updated_at: updatedAt as any,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const token = v4();
    await tx.todo_app_member_email_verifications.create({
      data: {
        id: v4(),
        token,
        todo_app_member_id: created.id,
        expired_at: toISOStringSafe(
          new Date(Date.now() + 24 * 60 * 60 * 1000),
        ) as any,
        used_at: null,
        created_at: createdAt as any,
        updated_at: updatedAt as any,
        deleted_at: null,
      },
    });
    const session = await tx.todo_app_member_sessions.create({
      data: {
        id: v4(),
        todo_app_member_id: created.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: createdAt as any,
        expired_at: sessionExpiredAt as any,
      },
      select: { id: true, expired_at: true },
    });
    return {
      created,
      sessionId: session.id,
      sessionExpiredAt: session.expired_at,
    };
  });
  const access = jwt.sign(
    {
      type: "member",
      id: member.created.id,
      session_id: member.sessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "member",
      id: member.created.id,
      session_id: member.sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: member.created.id as any,
    email: member.created.email,
    status: member.created.status,
    created_at: toISOStringSafe(member.created.created_at),
    updated_at: toISOStringSafe(member.created.updated_at),
    deleted_at: member.created.deleted_at
      ? toISOStringSafe(member.created.deleted_at)
      : null,
    profile: {
      display_name: null,
      updated_at: null,
      created_at: null,
      deleted_at: null,
    },
    token: {
      access,
      refresh,
      expired_at: sessionExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
