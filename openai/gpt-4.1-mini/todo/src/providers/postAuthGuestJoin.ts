import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: ITodoListGuest.ICreate;
}): Promise<ITodoListGuest.IAuthorized> {
  const existingGuest = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });
  if (existingGuest !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  const guestUser = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpire = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpireStr = toISOStringSafe(accessExpire);
  const refreshExpireStr = toISOStringSafe(refreshExpire);

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4(),
      todo_list_user_id: guestUser.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpireStr,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestUser.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestUser.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: guestUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireStr,
      refreshable_until: refreshExpireStr,
    },
  };
}
