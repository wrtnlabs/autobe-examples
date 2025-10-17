import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberLogin";
import { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoMemberLogin(props: {
  body: ITodoListTodoMemberLogin.ICreate;
}): Promise<ITodoListTodoMember.IAuthorized> {
  const { body } = props;
  const normalizedEmail = body.email.toLowerCase();

  const member = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!member) {
    throw new HttpException("Authentication failed", 401);
  }

  const valid = await PasswordUtil.verify(body.password, member.password_hash);
  if (!valid) {
    throw new HttpException("Authentication failed", 401);
  }

  const payload = {
    id: member.id as string & tags.Format<"uuid">,
    type: "todomember" as const,
    email: member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };

  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(
    {
      userId: member.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const result = {
    id: member.id as string & tags.Format<"uuid">,
    email: normalizedEmail as string & tags.Format<"email">,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: null as (string & tags.Format<"date-time">) | null | undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  } satisfies ITodoListTodoMember.IAuthorized;

  return result;
}
