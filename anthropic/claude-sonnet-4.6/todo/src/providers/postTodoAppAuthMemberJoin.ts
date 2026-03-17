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

export async function postTodoAppAuthMemberJoin(props: {
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Check for duplicate email (only active/non-deleted accounts)
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash the password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create the member record
  const memberId = v4();
  await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 4. Create the user profile (display_name defaults to email since IJoin has no display_name field)
  await MyGlobal.prisma.todo_app_user_profiles.create({
    data: {
      id: v4(),
      display_name: props.body.email,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: memberId } },
    },
  });
  // 5. Create the session record (expired_at = refresh token TTL = 7 days)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: v4(),
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: refreshExpires,
      member: { connect: { id: memberId } },
    },
    select: { id: true },
  });
  // 6. Generate JWT access and refresh tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: memberId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 7. Re-read the created member using the transformer for a complete response
  const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: memberId },
    ...TodoAppMemberTransformer.select(),
  });
  // 8. Return IAuthorized (member identity + token)
  return {
    ...(await TodoAppMemberTransformer.transform(member)),
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
