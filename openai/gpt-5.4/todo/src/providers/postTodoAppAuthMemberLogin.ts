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
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberLogin(props: {
  ip: string;
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...TodoAppMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (member === null) throw new HttpException("Invalid credentials", 401);
  const verified = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (verified === false) throw new HttpException("Invalid credentials", 401);
  const nowDate = new Date();
  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const now = nowDate.toISOString();
  const expiredAt = accessExpiresDate.toISOString();
  const refreshableUntil = refreshExpiresDate.toISOString();
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      member: {
        connect: {
          id: member.id,
        },
      },
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: nowDate,
      expired_at: accessExpiresDate,
    },
    select: {
      id: true,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
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
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    ...(await TodoAppMemberTransformer.transform(member)),
    token,
  };
}
