import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAppAuthMemberLogin(props: {
  ip: string;
  body: IMultiUserTodoAppMember.ILogin;
}): Promise<IMultiUserTodoAppMember.IAuthorized> {
  // 1. Find member by email with password_hash (account must be active)
  const member = await MyGlobal.prisma.multi_user_todo_app_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password hash
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate expiration timestamps as ISO strings
  const accessExpiration: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpiration: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 4. Create new session (cascade deletes old sessions for this member)
  await MyGlobal.prisma.multi_user_todo_app_member_sessions.deleteMany({
    where: {
      multi_user_todo_app_member_id: member.id,
    },
  });
  const session: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  // 5. Generate JWT tokens with session_id
  const accessToken: string = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 6. Create session with actual tokens
  await MyGlobal.prisma.multi_user_todo_app_member_sessions.create({
    data: {
      id: session,
      multi_user_todo_app_member_id: member.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpiration,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 7. Return authorized member response
  return {
    id: member.id,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    displayName: "",
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiration,
      refreshable_until: refreshExpiration,
    },
  } satisfies IMultiUserTodoAppMember.IAuthorized;
}
