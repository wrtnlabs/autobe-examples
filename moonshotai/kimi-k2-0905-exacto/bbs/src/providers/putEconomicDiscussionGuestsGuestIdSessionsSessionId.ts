import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";

export async function putEconomicDiscussionGuestsGuestIdSessionsSessionId(props: {
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionGuestSession.IUpdate;
}): Promise<IEconomicDiscussionGuestSession> {
  // Verify session exists and belongs to the guest
  const existingSession =
    await MyGlobal.prisma.economic_discussion_guest_sessions.findUnique({
      where: {
        id: props.sessionId,
        economic_discussion_guest_id: props.guestId,
      },
    });

  if (!existingSession) {
    throw new HttpException("Guest session not found", 404);
  }

  // Build update data from provided body fields
  const updateData = {
    ...(props.body.href !== undefined &&
      props.body.href !== null && { href: props.body.href }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    ...(props.body.expired_at !== undefined && {
      expired_at: props.body.expired_at,
    }),
  };

  // Update the session
  const updatedSession =
    await MyGlobal.prisma.economic_discussion_guest_sessions.update({
      where: { id: props.sessionId },
      data: updateData,
    });

  // Return formatted session with proper date-time conversions
  return {
    id: updatedSession.id as string & tags.Format<"uuid">,
    economic_discussion_guest_id:
      updatedSession.economic_discussion_guest_id as string &
        tags.Format<"uuid">,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer ?? undefined,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: updatedSession.expired_at
      ? toISOStringSafe(updatedSession.expired_at)
      : undefined,
  };
}
