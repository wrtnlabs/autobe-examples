import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoListMemberLogin(props: {
  body: ITodoListTodolistmember.ILogin;
}): Promise<ITodoListTodolistmember.IAuthorized> {
  const { email, password, href, referrer, ip } = props.body;
  const member = await MyGlobal.prisma.todo_list_todolistmembers.findFirst({
    where: { email },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const valid = await PasswordUtil.verify(password, member.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();

  const sessionData: any = {
    id: sessionId,
    todo_list_todolistmember_id: member.id,
    href,
    referrer,
    created_at: toISOStringSafe(now),
    expired_at: toISOStringSafe(accessExpires),
  };
  if (ip !== null && ip !== undefined)
    sessionData.ip = ip satisfies string as string;

  const session =
    await MyGlobal.prisma.todo_list_todolistmember_sessions.create({
      data: sessionData,
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "todolistmember",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "todolistmember",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    token,
  };
}
