import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeModeratorModerationActionsActionId(props: {
  moderator: ModeratorPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationAction> {
  const { moderator, actionId } = props;

  const action =
    await MyGlobal.prisma.reddit_like_moderation_actions.findUniqueOrThrow({
      where: { id: actionId },
    });

  return {
    id: action.id as string & tags.Format<"uuid">,
    action_type: action.action_type,
    content_type: action.content_type,
    removal_type: action.removal_type ?? undefined,
    reason_category: action.reason_category,
    reason_text: action.reason_text,
    status: action.status,
    created_at: toISOStringSafe(action.created_at),
  };
}
