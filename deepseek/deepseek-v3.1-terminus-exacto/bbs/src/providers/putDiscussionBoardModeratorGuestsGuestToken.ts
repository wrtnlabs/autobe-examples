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

export async function putDiscussionBoardModeratorGuestsGuestToken(props: {
  moderator: ModeratorPayload;
  guestToken: string;
  body: IDiscussionBoardGuest.IUpdate;
}): Promise<IDiscussionBoardGuest> {
  // Find the existing guest record
  const existing = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      guest_token: props.guestToken,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Guest not found", 404);
  }

  // Prepare update data without Date objects
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  // Handle deleted_at field properly based on DTO interface
  if (props.body.deleted_at !== undefined) {
    updateData.deleted_at =
      props.body.deleted_at === null ? null : new Date(props.body.deleted_at);
  }

  // Update the guest record
  const updated = await MyGlobal.prisma.discussion_board_guests.update({
    where: {
      id: existing.id,
    },
    data: updateData,
  });

  // Return the updated guest with proper type resolution
  return {
    id: updated.id,
    guest_token: updated.guest_token,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
