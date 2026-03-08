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

export async function postTodoAppAuthMemberJoin(props: {
  body: ITodoAppMemberSession.IJoin;
}): Promise<ITodoAppMemberSession.IAuthorized> {
  // Check duplicate email
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create user record
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      state: "active",
    },
  });
  // Create profile record
  const profile = await MyGlobal.prisma.todo_app_profiles.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      display_name: props.body.email.split("@")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // Create member record with relations
  const member = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      todo_app_profile_id: profile.id,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  });
  // Create session record
  const accessExpires = new Date();
  accessExpires.setHours(accessExpires.getHours() + 1);
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 7);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      todo_app_member_id: member.id,
      access_token: v4(),
      refresh_token: v4(),
      access_expires_at: accessExpires.toISOString(),
      refresh_expires_at: refreshExpires.toISOString(),
      ip: "0.0.0.0",
      user_agent: null,
      referrer: null,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Return authorized response
  return {
    id: session.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    access_expires_at: session.access_expires_at,
    refresh_expires_at: session.refresh_expires_at,
    ip: session.ip,
    user_agent: session.user_agent,
    referrer: session.referrer,
    last_used_at: session.last_used_at?.toISOString() ?? null,
    created_at: session.created_at.toISOString(),
    updated_at: session.updated_at.toISOString(),
    expired_at: session.expired_at?.toISOString() ?? null,
    user: {
      id: session.id,
      todo_app_member_id: member.id,
      last_used_at: session.last_used_at?.toISOString() ?? null,
      created_at: session.created_at.toISOString(),
    } satisfies ITodoAppMemberSession.ISummary,
    token,
  } satisfies ITodoAppMemberSession.IAuthorized;
}
