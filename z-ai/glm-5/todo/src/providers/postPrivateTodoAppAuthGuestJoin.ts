import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postPrivateTodoAppAuthGuestJoin(props: {
  ip: string;
  body: IPrivateTodoAppGuest.IJoin;
}): Promise<IPrivateTodoAppGuest.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.private_todo_app_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member with hashed password
  const now = new Date();
  const memberId = v4();
  const member = await MyGlobal.prisma.private_todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.private_todo_app_member_sessions.create(
    {
      data: {
        id: sessionId,
        member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    },
  );
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "2h", issuer: "autobe" },
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
      { expiresIn: "14d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return authorized response
  return {
    id: member.id,
    token,
  } satisfies IPrivateTodoAppGuest.IAuthorized;
}
