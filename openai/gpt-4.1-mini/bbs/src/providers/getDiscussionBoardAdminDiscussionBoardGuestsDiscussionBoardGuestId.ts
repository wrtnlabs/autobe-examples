import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardGuestsDiscussionBoardGuestId(props: {
  admin: AdminPayload;
  discussionBoardGuestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuest> {
  const guest = await MyGlobal.prisma.discussion_board_guest.findUnique({
    where: { id: props.discussionBoardGuestId },
  });

  if (!guest) {
    throw new HttpException("Discussion board guest not found", 404);
  }

  return {
    id: guest.id,
    nickname: guest.nickname,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at === null
        ? null
        : guest.deleted_at
          ? toISOStringSafe(guest.deleted_at)
          : undefined,
  };
}
