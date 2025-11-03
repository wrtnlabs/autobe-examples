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

export async function putRedditCommunityModeratorModeratorsModeratorIdActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerationAction.IUpdate;
}): Promise<IRedditCommunityModerationAction> {
  const { moderator, moderatorId, moderationActionId, body } = props;

  const moderationAction =
    await MyGlobal.prisma.reddit_community_moderation_actions.findUniqueOrThrow(
      {
        where: { id: moderationActionId },
      },
    );

  if (moderationAction.moderator_id !== moderatorId) {
    throw new HttpException(
      "Unauthorized to update this moderation action",
      403,
    );
  }

  const updated =
    await MyGlobal.prisma.reddit_community_moderation_actions.update({
      where: { id: moderationActionId },
      data: {
        action_type: body.action_type ?? undefined,
        action_notes: body.action_notes ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    content_report_id: updated.content_report_id,
    action_type: typia.assert<"deleted" | "dismissed" | "escalated">(
      updated.action_type,
    ),
    action_notes: updated.action_notes ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
