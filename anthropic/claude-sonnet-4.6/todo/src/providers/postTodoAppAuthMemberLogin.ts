import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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
  // 1. Find active member by email, explicitly selecting password_hash
  const memberWithPassword = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      ...TodoAppMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!memberWithPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password against stored hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    memberWithPassword.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create a new session record
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      member: { connect: { id: memberWithPassword.id } },
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: refreshExpires,
    },
    select: {
      id: true,
    },
  });
  // 4. Issue JWT access and refresh tokens
  const tokenCreatedAt = now.toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: memberWithPassword.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberWithPassword.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Transform member record (with profile) to DTO
  const member = await TodoAppMemberTransformer.transform(memberWithPassword);
  // 6. Return the authorized response
  return {
    id: member.id,
    email: member.email,
    profile: member.profile,
    created_at: member.created_at,
    updated_at: member.updated_at,
    deleted_at: member.deleted_at,
    token,
  };
}
