import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorGuestsGuestToken(props: {
  moderator: ModeratorPayload;
  guestToken: string;
}): Promise<IDiscussionBoardGuest> {
  // Verify moderator exists and is active
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found or inactive", 404);
  }

  // Find the guest record by guest_token
  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: {
      guest_token: props.guestToken,
    },
  });

  if (!guest) {
    throw new HttpException("Guest record not found", 404);
  }

  // Check if already deleted
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest record already deleted", 400);
  }

  const currentTime = toISOStringSafe(new Date());

  // Perform soft delete
  const updated = await MyGlobal.prisma.discussion_board_guests.update({
    where: {
      id: guest.id,
    },
    data: {
      deleted_at: currentTime,
      updated_at: currentTime,
    },
  });

  // Convert to API response format
  return {
    id: updated.id as string & tags.Format<"uuid">,
    guest_token: updated.guest_token,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
