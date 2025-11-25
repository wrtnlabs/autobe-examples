import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserLogin(props: {
  body: ITodoAppMemberUserLogin.ICreate;
}): Promise<ITodoAppMemberUser.IAuthorized> {
  // 1. Find member by email
  const member = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (!member) {
    // Do not reveal whether email exists
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Check account status
  if (member.status === "blocked" || member.status === "disabled") {
    // Business rule: blocked/disabled accounts cannot login
    throw new HttpException("Account is not allowed to login", 403);
  }

  // 3. Verify password
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 4. Compute expiry timestamps as ISO strings
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const nowIso = toISOStringSafe(now);
  const accessExpiresIso = toISOStringSafe(accessExpires);
  const refreshExpiresIso = toISOStringSafe(refreshExpires);

  // 5. Create new session record with expired_at = null at login time
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.create({
    data: {
      id: v4(),
      todo_app_memberuser_id: member.id,
      ip:
        props.body.ip !== undefined && props.body.ip !== null
          ? props.body.ip
          : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowIso,
      expired_at: null,
    },
  });

  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "memberuser",
      id: member.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "memberuser",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  // 7. Build response DTO, mapping DB fields to API contract
  return {
    id: member.id,
    email: member.email,
    display_name:
      member.display_name !== null && member.display_name !== undefined
        ? member.display_name
        : undefined,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    token,
  };
}
