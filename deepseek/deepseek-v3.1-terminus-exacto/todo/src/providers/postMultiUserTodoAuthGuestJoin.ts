import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoGuestTransformer } from "../transformers/MultiUserTodoGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoGuest.IJoin;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_guests.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  // 3. Create guest record
  const guestId = v4();
  const now = new Date();
  const guest = await MyGlobal.prisma.multi_user_todo_guests.create({
    data: {
      id: guestId,
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...MultiUserTodoGuestTransformer.select(),
  });
  // 4. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.multi_user_todo_guest_sessions.create({
    data: {
      id: v4(),
      multi_user_todo_guest_id: guest.id,
      ip: props.ip,
      href: "", // TODO: determine from request
      referrer: "", // TODO: determine from request
      created_at: now,
      expired_at: accessExpires,
    },
    select: {
      id: true,
      multi_user_todo_guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: session.id,
    created_at: toISOStringSafe(now),
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...tokenPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Transform guest and combine with token
  const guestResponse = await MultiUserTodoGuestTransformer.transform(guest);
  return {
    ...guestResponse,
    token,
  } satisfies IMultiUserTodoGuest.IAuthorized;
}
