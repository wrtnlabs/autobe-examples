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

export async function deleteDiscussionBoardModeratorModeratorsUsername(props: {
  moderator: ModeratorPayload;
  username: string;
}): Promise<IDiscussionBoardModerator> {
  // Find the target moderator by username
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Verify the requesting moderator has appropriate permissions
  // For now, any authenticated moderator can delete others
  // Additional authorization logic can be added here if needed

  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_moderators.delete({
    where: { id: targetModerator.id },
  });

  // Return the deleted moderator information with proper type conversion
  return {
    email: targetModerator.email as string & tags.Format<"email">,
    username: targetModerator.username,
    display_name: targetModerator.display_name ?? undefined,
    bio: targetModerator.bio ?? undefined,
    moderation_level: targetModerator.moderation_level,
  };
}
