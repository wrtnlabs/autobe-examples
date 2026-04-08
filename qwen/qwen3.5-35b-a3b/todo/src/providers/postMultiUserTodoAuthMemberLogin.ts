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

export async function postMultiUserTodoAuthMemberLogin(props: {
  ip: string;
  body: IMultiUserTodoMember.ILogin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  const { email, password, href, referrer } = props.body;
  const member = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: email },
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
    throw new HttpException("Invalid credentials", 401);
  }
  const passwordMatched: boolean = await PasswordUtil.verify(
    password,
    member.password_hash,
  );
  if (!passwordMatched) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account is deleted", 401);
  }
  const accessExpiresAt: string = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: v4(),
      multi_user_todo_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: href,
      referrer: referrer,
      created_at: new Date(),
      expired_at: accessExpiresAt,
    },
  });
  const accessJwt: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "60m", issuer: "autobe" },
  );
  const refreshJwt: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessJwt,
    refresh: refreshJwt,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  return {
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: token,
  };
}
