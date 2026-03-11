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
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Create member (manual, no collector)
  const memberId: string & tags.Format<"uuid"> = v4();
  const now = new Date().toISOString();
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.multi_user_todo_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    ...MultiUserTodoMemberTransformer.select(),
  });
  // 3. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: memberId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: memberId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 4. Create session with the actual tokens
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.multi_user_todo_member_sessions.create({
    data: {
      id: sessionId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(now),
      expired_at: new Date(accessExpires),
      member: { connect: { id: memberId } },
    } satisfies Prisma.multi_user_todo_member_sessionsCreateInput,
  });
  // 5. Return IAuthorized using Transformer
  return {
    ...(await MultiUserTodoMemberTransformer.transform(member)),
    token,
  } satisfies IMultiUserTodoMember.IAuthorized;
}
