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
  ip: string;
  body: ITodoAppMember.ILogin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email },
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
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate token timestamps as strings
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const accessExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  // 4. Generate session ID
  const sessionId: string & tags.Format<"uuid"> = v4();
  // 5. Generate JWT tokens
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Create new session with actual tokens
  await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      todo_app_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
      expired_at: accessExpiresIso,
    },
  });
  // 7. Build authorization token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  // 8. Return IAuthorized
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
