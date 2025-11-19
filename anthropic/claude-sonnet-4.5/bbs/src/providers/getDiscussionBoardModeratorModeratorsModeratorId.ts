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

export async function getDiscussionBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerator.ISummary> {
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: {
        id: props.moderatorId,
      },
    });

  if (targetModerator === null) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: targetModerator.id as string & tags.Format<"uuid">,
    email: targetModerator.email as string & tags.Format<"email">,
    username: targetModerator.username,
    display_name: targetModerator.display_name ?? undefined,
    email_verified: targetModerator.email_verified,
    email_verified_at: targetModerator.email_verified_at
      ? toISOStringSafe(targetModerator.email_verified_at)
      : undefined,
    is_active: targetModerator.is_active,
    last_login_at: targetModerator.last_login_at
      ? toISOStringSafe(targetModerator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(targetModerator.created_at),
    updated_at: toISOStringSafe(targetModerator.updated_at),
    deleted_at: targetModerator.deleted_at
      ? toISOStringSafe(targetModerator.deleted_at)
      : undefined,
  };
}
