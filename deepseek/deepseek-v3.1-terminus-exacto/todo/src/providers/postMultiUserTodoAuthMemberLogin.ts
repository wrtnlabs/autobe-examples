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
  // 1. Find member with password_hash
  const member = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      ...MultiUserTodoMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionId = v4();
  const session = await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_member_id: member.id,
      ip: props.ip, // Fixed: use props.ip instead of props.body.ip
      href: "", // Empty string instead of null
      referrer: "", // Empty string instead of null
      created_at: toISOStringSafe(now), // Use toISOStringSafe instead of toISOString
      expired_at: toISOStringSafe(accessExpires), // Use toISOStringSafe
      access_token: "", // Will be set by JWT
      refresh_token: "", // Will be set by JWT
    },
  });
  // 4. Generate JWT tokens
  const tokenPayload = {
    type: "member",
    id: member.id,
    session_id: sessionId,
    created_at: toISOStringSafe(now), // Use toISOStringSafe
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with actual tokens
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 5. Build response token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires), // Use toISOStringSafe
    refreshable_until: toISOStringSafe(refreshExpires), // Use toISOStringSafe
  };
  // 6. Return IAuthorized
  const memberData = await MultiUserTodoMemberTransformer.transform(member);
  return {
    ...memberData,
    token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
