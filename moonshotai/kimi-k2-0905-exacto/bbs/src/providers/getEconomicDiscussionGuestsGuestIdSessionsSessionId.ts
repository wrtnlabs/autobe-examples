import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function getEconomicDiscussionGuestsGuestIdSessionsSessionId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionGuestSession.IInvert> {
  // Verify the guest is accessing their own session
  if (props.guest.id !== props.guestId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  const session =
    await MyGlobal.prisma.economic_discussion_guest_sessions.findUnique({
      where: {
        id: props.sessionId,
        economic_discussion_guest_id: props.guestId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id as string & tags.Format<"uuid">,
    economic_discussion_guest_id:
      session.economic_discussion_guest_id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? "",
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
