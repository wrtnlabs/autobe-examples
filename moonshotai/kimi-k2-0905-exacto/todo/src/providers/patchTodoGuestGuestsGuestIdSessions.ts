import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuestSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchTodoGuestGuestsGuestIdSessions(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  body: ITodoGuestSession.IRequest;
}): Promise<ITodoGuestSession> {
  // Authorization check - guest can only modify their own session
  if (props.guest.id !== props.guestId) {
    throw new HttpException(
      "Unauthorized: Guests can only modify their own sessions",
      403,
    );
  }

  // Expire previous active sessions for this guest
  await MyGlobal.prisma.todo_guest_sessions.updateMany({
    where: {
      todo_guest_id: props.guestId,
      expired_at: null,
    },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });

  // Create new refreshed session
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.todo_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_guest_id: props.guestId,
      ip: props.body.ip ?? "",
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      created_at: now,
      expired_at: null, // Start as active
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    todo_guest_id: created.todo_guest_id as string & tags.Format<"uuid">,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at as Date),
    expired_at: null, // New session starts active
  } satisfies ITodoGuestSession;
}
