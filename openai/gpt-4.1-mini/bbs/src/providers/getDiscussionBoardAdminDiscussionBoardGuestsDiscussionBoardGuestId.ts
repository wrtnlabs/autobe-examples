import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardGuestsDiscussionBoardGuestId(props: {
  admin: AdminPayload;
  discussionBoardGuestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardGuest> {
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id: props.discussionBoardGuestId },
      select: {
        id: true,
        session_token: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );

  return {
    id: guest.id,
    session_token: guest.session_token,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
