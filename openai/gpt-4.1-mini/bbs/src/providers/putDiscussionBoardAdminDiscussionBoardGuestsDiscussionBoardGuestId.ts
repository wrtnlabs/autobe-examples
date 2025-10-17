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

export async function putDiscussionBoardAdminDiscussionBoardGuestsDiscussionBoardGuestId(props: {
  admin: AdminPayload;
  discussionBoardGuestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardGuest.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardGuest> {
  const { admin, discussionBoardGuestId, body } = props;

  const existingGuest =
    await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow({
      where: { id: discussionBoardGuestId },
    });

  const duplicateToken =
    await MyGlobal.prisma.discussion_board_guests.findFirst({
      where: {
        session_token: body.session_token,
        NOT: { id: discussionBoardGuestId },
      },
    });

  if (duplicateToken !== null) {
    throw new HttpException("Duplicate session_token exists", 409);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_guests.update({
    where: { id: discussionBoardGuestId },
    data: {
      session_token: body.session_token,
      updated_at: now,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
    },
  });

  return {
    id: updated.id,
    session_token: updated.session_token,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
