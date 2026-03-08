import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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
  body: ITodoAppMemberSession.ILogin;
}): Promise<ITodoAppMemberSession.IAuthorized> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      todo_app_user_id: true,
      todo_app_profile_id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
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
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      todo_app_member_id: member.id,
      access_token: v4(),
      refresh_token: v4(),
      access_expires_at: toISOStringSafe(accessExpires),
      refresh_expires_at: toISOStringSafe(refreshExpires),
      ip: props.body.ip ?? "0.0.0.0",
      user_agent: null,
      referrer: props.body.referrer,
      last_used_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: session.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    access_expires_at: toISOStringSafe(session.access_expires_at),
    refresh_expires_at: toISOStringSafe(session.refresh_expires_at),
    ip: session.ip,
    user_agent: session.user_agent,
    referrer: session.referrer,
    last_used_at: toISOStringSafe(session.last_used_at ?? new Date()),
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expired_at: toISOStringSafe(session.expired_at ?? new Date()),
    user: {
      id: member.id,
      todo_app_member_id: member.id,
      last_used_at: toISOStringSafe(session.last_used_at ?? new Date()),
      created_at: toISOStringSafe(session.created_at),
    },
    token,
  };
}
