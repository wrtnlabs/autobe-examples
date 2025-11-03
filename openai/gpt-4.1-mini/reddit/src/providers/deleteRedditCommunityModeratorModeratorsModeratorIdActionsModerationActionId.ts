import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorModeratorsModeratorIdActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, moderatorId, moderationActionId } = props;

  const moderationAction =
    await MyGlobal.prisma.reddit_community_moderation_actions.findUniqueOrThrow(
      {
        where: { id: moderationActionId },
      },
    );

  if (moderationAction.moderator_id !== moderatorId) {
    throw new HttpException(
      "Forbidden: You can only delete your own moderation actions",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_moderation_actions.delete({
    where: { id: moderationActionId },
  });
}
