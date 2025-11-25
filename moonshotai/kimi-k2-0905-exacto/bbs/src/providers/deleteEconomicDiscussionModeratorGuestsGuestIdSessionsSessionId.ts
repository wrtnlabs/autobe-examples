import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorGuestsGuestIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.economic_discussion_guest_sessions.findUnique({
      where: {
        id: props.sessionId,
        economic_discussion_guest_id: props.guestId,
      },
    });

  if (!existing) {
    throw new HttpException("Guest session not found", 404);
  }

  await MyGlobal.prisma.economic_discussion_guest_sessions.delete({
    where: { id: props.sessionId },
  });
}
