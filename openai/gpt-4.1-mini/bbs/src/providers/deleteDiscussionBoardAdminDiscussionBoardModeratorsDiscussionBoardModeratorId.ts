import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardModeratorsDiscussionBoardModeratorId(props: {
  admin: AdminPayload;
  discussionBoardModeratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, discussionBoardModeratorId } = props;

  // Verify moderator exists
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: { id: discussionBoardModeratorId },
    });

  // No ownership check needed for admin

  await MyGlobal.prisma.discussion_board_moderators.delete({
    where: { id: discussionBoardModeratorId },
  });
}
