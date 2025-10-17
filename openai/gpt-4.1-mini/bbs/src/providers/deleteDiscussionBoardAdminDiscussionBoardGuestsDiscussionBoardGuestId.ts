import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { discussionBoardGuestId } = props;

  await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow({
    where: { id: discussionBoardGuestId },
  });

  await MyGlobal.prisma.discussion_board_guests.delete({
    where: { id: discussionBoardGuestId },
  });
}
