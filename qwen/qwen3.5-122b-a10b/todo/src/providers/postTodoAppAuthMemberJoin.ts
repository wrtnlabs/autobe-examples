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

export async function postTodoAppAuthMemberJoin(props: {
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const id = v4();
  const now = new Date();
  const member = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.displayName,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.todo_app_membersCreateInput,
    ...TodoAppMemberTransformer.select(),
  });
  // 4. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      member: { connect: { id: member.id } },
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires,
    } satisfies Prisma.todo_app_member_sessionsCreateInput,
  });
  // 5. Create email verification token
  const verificationToken = v4();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.todo_app_member_email_verifications.create({
    data: {
      id: v4(),
      member: { connect: { id: member.id } },
      token: verificationToken,
      expires_at: verificationExpires,
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.todo_app_member_email_verificationsCreateInput,
  });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 7. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
