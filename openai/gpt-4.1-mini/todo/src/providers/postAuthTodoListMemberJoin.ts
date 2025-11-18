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

export async function postAuthTodoListMemberJoin(props: {
  body: ITodoListTodolistmember.ICreate;
}): Promise<ITodoListTodolistmember.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_todolistmembers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const memberId = v4();
  const member = await MyGlobal.prisma.todo_list_todolistmembers.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
    },
  });
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4();
  const session =
    await MyGlobal.prisma.todo_list_todolistmember_sessions.create({
      data: {
        id: sessionId,
        todo_list_todolistmember_id: memberId,
        ip:
          props.body.ip !== undefined && props.body.ip !== null
            ? (props.body.ip satisfies string as string)
            : "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpire,
      },
    });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "todolistmember",
        id: member.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "todolistmember",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    token,
  };
}
