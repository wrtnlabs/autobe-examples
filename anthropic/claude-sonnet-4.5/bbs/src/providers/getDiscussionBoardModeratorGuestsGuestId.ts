import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorGuestsGuestId(props: {
  moderator: ModeratorPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuest> {
  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { id: props.guestId },
  });

  if (!guest) {
    throw new HttpException("Guest record not found", 404);
  }

  return {
    id: guest.id,
    session_identifier: guest.session_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    first_visit_at: toISOStringSafe(guest.first_visit_at),
    last_visit_at: toISOStringSafe(guest.last_visit_at),
    page_views: guest.page_views,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
  };
}
