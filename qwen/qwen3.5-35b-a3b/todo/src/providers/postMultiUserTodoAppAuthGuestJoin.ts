import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAppAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoAppGuest.IJoin;
}): Promise<IMultiUserTodoAppGuest.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_app_guests.findFirst({
    where: { email: props.body.email },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create guest actor
  const guest = await MyGlobal.prisma.multi_user_todo_app_guests.create({
    data: {
      id: v4() as unknown as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 3. Create guest session
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.multi_user_todo_app_guest_sessions.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        guest: { connect: { id: guest.id } },
        device_id: v4() as unknown as string & tags.Format<"uuid">,
        fingerprint: v4() as unknown as string & tags.Format<"uuid">,
        href: props.body.href,
        referrer: props.body.referrer,
        ip: props.body.ip !== undefined ? props.body.ip : props.ip,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return IAuthorized
  return {
    id: guest.id,
    token,
  } satisfies IMultiUserTodoAppGuest.IAuthorized;
}
