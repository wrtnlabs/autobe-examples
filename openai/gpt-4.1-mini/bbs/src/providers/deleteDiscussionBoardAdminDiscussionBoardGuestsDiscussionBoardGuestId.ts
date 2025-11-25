import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardGuestsDiscussionBoardGuestId(props: {
  admin: AdminPayload;
  discussionBoardGuestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const guest = await MyGlobal.prisma.discussion_board_guest.findUnique({
    where: { id: props.discussionBoardGuestId },
  });

  if (guest === null) {
    throw new HttpException("Discussion board guest not found", 404);
  }

  await MyGlobal.prisma.discussion_board_guest.delete({
    where: { id: props.discussionBoardGuestId },
  });
}
