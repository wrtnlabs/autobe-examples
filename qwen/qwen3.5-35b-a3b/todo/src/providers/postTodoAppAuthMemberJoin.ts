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

export async function postTodoAppAuthMemberJoin(props: {
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email.toLowerCase() },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Generate UUIDs upfront
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  // 3. Prepare timestamps as ISO strings
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(
    Date.now() + 15 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 4. Generate JWT tokens
  const accessJwt = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshJwt = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create member record with hashed password
  const member = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email.toLowerCase(),
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.displayName ?? props.body.email.split("@")[0],
      created_at: new Date(now),
      updated_at: new Date(now),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 6. Create session record
  await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      todo_app_member_id: member.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(now),
      expired_at: new Date(accessExpires),
    },
  });
  // 7. Build authorization token
  const token: IAuthorizationToken = {
    access: accessJwt,
    refresh: refreshJwt,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 8. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
