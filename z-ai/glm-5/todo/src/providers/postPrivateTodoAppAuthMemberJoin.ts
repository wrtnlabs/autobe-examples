import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PrivateTodoAppMemberTransformer } from "../transformers/PrivateTodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postPrivateTodoAppAuthMemberJoin(props: {
  ip: string;
  body: IPrivateTodoAppMember.IJoin;
}): Promise<IPrivateTodoAppMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.private_todo_app_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member
  const member = await MyGlobal.prisma.private_todo_app_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      display_name: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...PrivateTodoAppMemberTransformer.select(),
  });
  // 4. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.private_todo_app_member_sessions.create(
    {
      data: {
        id: v4(),
        member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    },
  );
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  const transformedMember =
    await PrivateTodoAppMemberTransformer.transform(member);
  return {
    ...transformedMember,
    token,
  } satisfies IPrivateTodoAppMember.IAuthorized;
}
