import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const password_hash = await PasswordUtil.hash(props.body.password);
  const userId = v4();
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const sessionExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const sessionRefreshUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      disabled_at: null,
    },
  });
  const sessionData: any = {
    id: sessionId,
    todo_list_user_id: userId,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: sessionExpiredAt,
  };
  if (props.body.ip !== null && props.body.ip !== undefined) {
    sessionData.ip = props.body.ip satisfies string as string;
  }
  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: sessionData,
  });
  const accessToken = jwt.sign(
    { id: userId, session_id: sessionId, type: "user", created_at: now },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      id: userId,
      session_id: sessionId,
      type: "user",
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: sessionExpiredAt,
    refreshable_until: sessionRefreshUntil,
  };
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    disabled_at:
      user.disabled_at === null ? undefined : toISOStringSafe(user.disabled_at),
    token,
  };
}
