import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function putDiscussionBoardDiscussionBoardGuestsDiscussionBoardGuestId(props: {
  discussionBoardGuestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardGuest.IUpdate;
}): Promise<IDiscussionBoardGuest> {
  const existing = await MyGlobal.prisma.discussion_board_guest.findUnique({
    where: { id: props.discussionBoardGuestId },
  });

  if (!existing) {
    throw new HttpException("Discussion board guest user not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_guest.update({
    where: { id: props.discussionBoardGuestId },
    data: {
      nickname: props.body.nickname,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
