import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string;
}): Promise<IDiscussionBoardModerator> {
  const existing = await MyGlobal.prisma.discussion_board_moderators.findFirst({
    where: {
      id: props.moderatorId,
    },
  });

  if (!existing) {
    throw new HttpException("Moderator not found", 404);
  }

  const deleted = await MyGlobal.prisma.discussion_board_moderators.delete({
    where: {
      id: props.moderatorId,
    },
  });

  return {
    id: deleted.id,
    email: deleted.email,
    password_hash: deleted.password_hash,
    username: deleted.username,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
  };
}
