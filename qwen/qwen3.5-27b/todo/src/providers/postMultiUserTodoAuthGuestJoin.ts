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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoGuest.IJoin;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // Check for existing guest by device_token
  const existingGuest = await MyGlobal.prisma.multi_user_todo_guests.findFirst({
    where: {
      device_token: props.body.device_token,
      deleted_at: null,
    },
  });
  let guest;
  if (existingGuest) {
    // Return existing guest
    guest = existingGuest;
  } else {
    // Create new guest
    guest = await MyGlobal.prisma.multi_user_todo_guests.create({
      data: {
        id: v4(),
        device_token: props.body.device_token,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.multi_user_todo_guest_sessions.create({
    data: {
      id: v4(),
      multi_user_todo_guest_id: guest.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: guest.id,
    token,
  };
}
