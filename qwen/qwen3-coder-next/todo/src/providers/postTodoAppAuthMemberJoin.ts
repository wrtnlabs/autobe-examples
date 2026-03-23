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
  ip: string;
  body: ITodoAppMemberSession.IJoin;
}): Promise<ITodoAppMemberSession.IAuthorized> {
  const email = props.body.email.toLowerCase();
  const existingMember = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email },
  });
  if (existingMember) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email,
      password_hash: await PasswordUtil.hash(props.body.password),
      state: "pending_verification" as const,
      created_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
    },
  });
  const profile = await MyGlobal.prisma.todo_app_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      display_name: email.split("@")[0],
      created_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
    },
  });
  const member = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      todo_app_profile_id: profile.id,
      email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
    },
    select: {
      id: true,
      email: true,
    },
  });
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_member_id: member.id,
      ip: props.ip,
      access_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: "",
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "member",
          id: member.id,
          session_id: "",
          tokenType: "refresh",
          created_at: now.toISOString(),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      access_expires_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpires.toISOString(),
      ),
      refresh_expires_at: typia.assert<string & tags.Format<"date-time">>(
        refreshExpires.toISOString(),
      ),
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpires.toISOString(),
      ),
      created_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
      updated_at: typia.assert<string & tags.Format<"date-time">>(
        now.toISOString(),
      ),
    },
  });
  return {
    member: {
      id: member.id,
      email: member.email,
      displayName: email.split("@")[0],
    },
    access_token: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      access_expires_at: typia.assert<string & tags.Format<"date-time">>(
        session.access_expires_at,
      ),
      refresh_expires_at: typia.assert<string & tags.Format<"date-time">>(
        session.refresh_expires_at,
      ),
      expired_at: null,
    },
    refresh_token: {
      access_token: session.refresh_token,
      refresh_token: session.refresh_token,
      access_expires_at: typia.assert<string & tags.Format<"date-time">>(
        session.refresh_expires_at,
      ),
      refresh_expires_at: typia.assert<string & tags.Format<"date-time">>(
        session.refresh_expires_at,
      ),
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        session.refresh_expires_at,
      ),
    },
    token: {
      access: session.access_token,
      refresh: session.refresh_token,
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpires.toISOString(),
      ),
      refreshable_until: typia.assert<string & tags.Format<"date-time">>(
        refreshExpires.toISOString(),
      ),
    },
  } satisfies ITodoAppMemberSession.IAuthorized;
}
