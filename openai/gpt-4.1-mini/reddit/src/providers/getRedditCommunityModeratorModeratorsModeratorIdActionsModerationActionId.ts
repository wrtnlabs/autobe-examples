import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorModeratorsModeratorIdActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerationAction> {
  const { moderator, moderatorId, moderationActionId } = props;

  if (moderator.id !== moderatorId) {
    throw new HttpException("Not Found", 404);
  }

  const moderationAction =
    await MyGlobal.prisma.reddit_community_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        moderator_id: moderatorId,
      },
    });

  if (!moderationAction) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: moderationAction.id,
    moderator_id: moderationAction.moderator_id,
    content_report_id: moderationAction.content_report_id,
    action_type: typia.assert<"deleted" | "dismissed" | "escalated">(
      moderationAction.action_type,
    ),
    action_notes: moderationAction.action_notes ?? null,
    created_at: toISOStringSafe(moderationAction.created_at),
    updated_at: toISOStringSafe(moderationAction.updated_at),
  };
}
