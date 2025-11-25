import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postEconomicDiscussionGuestsGuestIdSessions(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionGuestSession.ICreate;
}): Promise<IEconomicDiscussionGuestSession> {
  // Verify the guest exists and matches the authenticated guest
  const guest = await MyGlobal.prisma.economic_discussion_guests.findUnique({
    where: { id: props.guestId },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  // Security: Ensure the guestId matches the authenticated guest
  if (props.guestId !== props.guest.id) {
    throw new HttpException("Forbidden - guest ID mismatch", 403);
  }

  // Create new session with expiration time (24 hours from now)
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.economic_discussion_guest_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        economic_discussion_guest_id: props.guestId,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: expiredAt,
      },
    });

  return {
    id: session.id,
    economic_discussion_guest_id: session.economic_discussion_guest_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
