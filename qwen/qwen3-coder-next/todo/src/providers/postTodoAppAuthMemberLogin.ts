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
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberLogin(props: {
  ip: string;
  body: ITodoAppMemberSession.ILogin;
}): Promise<ITodoAppMemberSession.IAuthorized> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...TodoAppMemberSessionAtSummaryTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresAt = toISOStringSafe(accessExpires);
  const refreshExpiresAt = toISOStringSafe(refreshExpires);
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_member_id: member.id as string & tags.Format<"uuid">,
      access_token: jwt.sign(
        {
          type: "member" as const,
          id: member.id,
          session_id: "ACCESS_TOKEN",
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh_token: jwt.sign(
        {
          type: "member" as const,
          id: member.id,
          session_id: "REFRESH_TOKEN",
          tokenType: "refresh" as const,
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      ip: props.ip,
      user_agent: "",
      referrer: "",
      created_at: now,
      updated_at: now,
      expired_at: null,
    },
  });
  const memberSummary =
    await TodoAppMemberSessionAtSummaryTransformer.transform(member);
  return {
    member: memberSummary,
    access_token: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      access_expires_at: toISOStringSafe(session.access_expires_at),
      refresh_expires_at: toISOStringSafe(session.refresh_expires_at),
      expired_at:
        session.expired_at !== null
          ? toISOStringSafe(session.expired_at)
          : null,
    },
    refresh_token: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      access_expires_at: toISOStringSafe(session.access_expires_at),
      refresh_expires_at: toISOStringSafe(session.refresh_expires_at),
      expired_at:
        session.expired_at !== null
          ? toISOStringSafe(session.expired_at)
          : null,
    },
    token: {
      access: session.access_token,
      refresh: session.refresh_token,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
