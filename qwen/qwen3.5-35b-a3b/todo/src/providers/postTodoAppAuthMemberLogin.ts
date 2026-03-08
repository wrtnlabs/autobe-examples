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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberLogin(props: {
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  const { email, password } = props.body;
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: email.toLowerCase(),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValidPassword = await PasswordUtil.verify(
    password,
    member.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresAt: Date = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.todo_app_member_sessions.deleteMany({
    where: {
      todo_app_member_id: member.id,
    },
  });
  const sessionId: string = v4();
  const newSession = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      todo_app_member_id: member.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: accessExpiresAt,
    },
  });
  const now: Date = new Date();
  const accessPayload: Record<string, unknown> = {
    type: "member" as const,
    id: member.id,
    session_id: newSession.id,
    created_at: now.toISOString(),
  };
  const refreshPayload: Record<string, unknown> = {
    type: "member" as const,
    id: member.id,
    session_id: newSession.id,
    token_type: "refresh" as const,
    created_at: now.toISOString(),
  };
  const accessToken: string = jwt.sign(
    accessPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m" as const, issuer: "autobe" as const },
  );
  const refreshToken: string = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d" as const, issuer: "autobe" as const },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpiresAt),
    refreshable_until: toISOStringSafe(refreshExpiresAt),
  };
  const transformedMember: ITodoAppMember = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
  return {
    ...transformedMember,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
