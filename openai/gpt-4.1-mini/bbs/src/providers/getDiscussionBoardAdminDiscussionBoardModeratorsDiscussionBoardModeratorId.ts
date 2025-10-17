import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardModeratorsDiscussionBoardModeratorId(props: {
  admin: AdminPayload;
  discussionBoardModeratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardModerator> {
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUniqueOrThrow({
      where: { id: props.discussionBoardModeratorId },
    });

  return {
    id: moderator.id,
    email: moderator.email,
    password_hash: moderator.password_hash,
    display_name: moderator.display_name,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
  };
}
