import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerator> {
  const existing = await MyGlobal.prisma.discussion_board_moderators.findUnique(
    {
      where: { id: props.moderatorId },
    },
  );

  if (!existing) {
    throw new HttpException("Moderator not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Moderator account already deleted", 410);
  }

  const [deleted] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: props.moderatorId },
      data: {
        deleted_at: new Date(),
        is_active: false,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.discussion_board_moderator_sessions.updateMany({
      where: {
        discussion_board_moderator_id: props.moderatorId,
        expired_at: null,
      },
      data: {
        expired_at: new Date(),
      },
    }),
  ]);

  return {
    id: deleted.id,
    email: deleted.email,
    username: deleted.username,
    display_name: deleted.display_name ?? null,
    email_verified: deleted.email_verified,
    email_verified_at: deleted.email_verified_at
      ? toISOStringSafe(deleted.email_verified_at)
      : null,
    is_active: deleted.is_active,
    last_login_at: deleted.last_login_at
      ? toISOStringSafe(deleted.last_login_at)
      : null,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at ? toISOStringSafe(deleted.deleted_at) : null,
  };
}
