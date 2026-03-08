import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestJoin(props: {
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  // 1. Check duplicate email (case-insensitive)
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      email: { equals: props.body.email.toLowerCase() },
    },
  });
  if (existingGuest) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Calculate timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 3. Create guest account with hashed password
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email.toLowerCase(),
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Create user profile with display name (references guest as member_id)
  const profile = await MyGlobal.prisma.todo_app_user_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_member_id: guest.id,
      display_name: props.body.displayName,
      last_display_name_change_at: toISOStringSafe(now),
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
    select: {
      id: true,
      display_name: true,
      last_display_name_change_at: true,
    },
  });
  // 5. Create session record
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_guest_id: guest.id,
      ip: props.body.ip ?? "127.0.0.1",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
    select: {
      id: true,
    },
  });
  // 6. Generate JWT tokens
  const tokenPayload: {
    type: "guest";
    id: string;
    session_id: string;
    created_at: string;
  } = {
    type: "guest",
    id: guest.id,
    session_id: session.id,
    created_at: toISOStringSafe(now),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Return IAuthorized
  return {
    id: guest.id,
    email: guest.email,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies ITodoAppGuest.IAuthorized;
}
