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
import { MultiUserTodoMemberTransformer } from "../transformers/MultiUserTodoMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthMemberLogin(props: {
  ip: string;
  body: IMultiUserTodoMember.ILogin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...MultiUserTodoMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check if account is soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Calculate token expiration
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // 5. Generate session UUID
  const sessionId = v4();
  // 6. Generate JWT tokens with session ID
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session record
  await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 8. Build token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 9. Transform and return
  return {
    ...(await MultiUserTodoMemberTransformer.transform(member)),
    token,
  };
}
