import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppGuestSessionCollector } from "../collectors/TodoAppGuestSessionCollector";
import { TodoAppGuestSessionTransformer } from "../transformers/TodoAppGuestSessionTransformer";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  // Check for existing guest by guestIdentifier
  const existing = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { guest_identifier: props.body.guestIdentifier },
  });
  if (existing) {
    throw new HttpException("guestIdentifier already registered", 409);
  }
  const now = new Date();
  // Create new guest record with required timestamps
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: v4(),
      guest_identifier: props.body.guestIdentifier,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    select: {
      id: true,
      guest_identifier: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const accessExpires = new Date(Date.now() + 3600000); // 1 hour
  const refreshExpires = new Date(Date.now() + 604800000); // 7 days
  // Create new guest session linked to guest
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: await TodoAppGuestSessionCollector.collect({
      ...props.body,
      guest: { id: guest.id },
    }),
    ...TodoAppGuestSessionTransformer.select(),
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies ITodoAppAccessToken;
  // Construct response matching ITodoAppGuest.IAuthorized
  return {
    id: guest.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    guestIdentifier: guest.guest_identifier,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt:
      guest.updated_at === null ? null : toISOStringSafe(guest.updated_at),
    deletedAt:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    token,
  };
}
