import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuestSession";

export async function getTodoGuestsGuestIdSessionsSessionId(props: {
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoGuestSession> {
  // Find the specific guest session by both session ID and guest ID
  const session = await MyGlobal.prisma.todo_guest_sessions.findUniqueOrThrow({
    where: {
      id: props.sessionId,
      todo_guest_id: props.guestId,
    },
  });

  // Transform to API response format with proper typing
  return {
    id: session.id as string & tags.Format<"uuid">,
    todo_guest_id: session.todo_guest_id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
