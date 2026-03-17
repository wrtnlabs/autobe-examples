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

export async function postMultiUserTodoAuthMemberJoin(props: {
  ip: string;
  body: IMultiUserTodoMember.IJoin;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member with UUID v7 and timestamps
  const memberId = v4();
  const createdAt = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.multi_user_todo_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(createdAt),
      updated_at: new Date(createdAt),
      deleted_at: null,
    },
    ...MultiUserTodoMemberTransformer.select(),
  });
  // Create session with tokens
  const sessionId = v4();
  const nowMs = Date.now();
  const accessExpireMs = nowMs + 15 * 60 * 1000; // 15 minutes
  const refreshExpireMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiresAt = toISOStringSafe(new Date(accessExpireMs));
  const refreshExpiresAt = toISOStringSafe(new Date(refreshExpireMs));
  const sessionCreatedAt = toISOStringSafe(new Date(nowMs));
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: sessionCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: sessionCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: new Date(refreshExpiresAt),
      created_at: new Date(sessionCreatedAt),
    },
  });
  // Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // Transform member and return IAuthorized
  const memberData = await MultiUserTodoMemberTransformer.transform(member);
  return {
    id: memberData.id,
    email: memberData.email,
    created_at: memberData.created_at,
    updated_at: memberData.updated_at,
    deleted_at: memberData.deleted_at,
    token,
  };
}
