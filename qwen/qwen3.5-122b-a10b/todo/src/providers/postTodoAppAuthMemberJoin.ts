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
  ip: string;
  body: ITodoAppMember.IJoin;
}): Promise<ITodoAppMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.todo_app_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Prepare data with proper typing
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const displayName: string =
    props.body.display_name ?? props.body.email.split("@")[0];
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  const memberId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  // 3. Create member record
  await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: displayName,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create email verification token (24 hours)
  const verificationExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const verificationToken: string = v4();
  await MyGlobal.prisma.todo_app_member_email_verifications.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(v4()),
      todo_app_member_id: memberId,
      email: props.body.email,
      token: verificationToken,
      created_at: now,
      expired_at: verificationExpires,
      verified_at: null,
    },
  });
  // 5. Create session with JWT tokens
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(v4());
  const accessToken: string = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
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
  await MyGlobal.prisma.todo_app_member_sessions.create({
    data: {
      id: sessionId,
      todo_app_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: refreshExpires,
    },
  });
  // 6. Build response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: memberId,
    email: props.body.email,
    display_name: displayName,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token,
  } satisfies ITodoAppMember.IAuthorized;
}
