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

export async function getDiscussionBoardModeratorGuestsGuestToken(props: {
  moderator: ModeratorPayload;
  guestToken: string;
}): Promise<IDiscussionBoardGuest> {
  // Find the guest record by guest_token, excluding soft-deleted records
  const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      guest_token: props.guestToken,
      deleted_at: null,
    },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  // Return the guest record with proper type conversion
  return {
    id: guest.id as string & tags.Format<"uuid">,
    guest_token: guest.guest_token,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at
      ? toISOStringSafe(guest.deleted_at)
      : undefined,
  };
}
