import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicDiscussionModeratorGuestsGuestId(props: {
  moderator: ModeratorPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionGuest> {
  const guest = await MyGlobal.prisma.economic_discussion_guests.findUnique({
    where: { id: props.guestId },
  });

  if (!guest) {
    throw new HttpException("Guest user not found", 404);
  }

  return {
    id: guest.id as string & tags.Format<"uuid">,
    username: guest.username,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent ?? undefined,
    created_at: toISOStringSafe(guest.created_at),
    last_activity_at: toISOStringSafe(guest.last_activity_at),
    articles_viewed_count: guest.articles_viewed_count,
    downloads_count: guest.downloads_count,
  };
}
