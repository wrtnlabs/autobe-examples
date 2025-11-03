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

export async function postRedditCommunityModeratorModeratorsModeratorIdActions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModerationAction.ICreate;
}): Promise<IRedditCommunityModerationAction> {
  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  // Validate the action_type to be valid enum
  const validActionTypes = ["deleted", "dismissed", "escalated"] as const;
  if (!validActionTypes.includes(props.body.action_type as any)) {
    throw new HttpException("Invalid action_type", 400);
  }
  const actionType = props.body.action_type as
    | "deleted"
    | "dismissed"
    | "escalated";

  const created =
    await MyGlobal.prisma.reddit_community_moderation_actions.create({
      data: {
        id: newId,
        moderator_id: props.moderatorId,
        content_report_id: props.body.content_report_id,
        action_type: actionType,
        action_notes: props.body.action_notes ?? null,
        created_at: nowISO,
        updated_at: nowISO,
      },
    });

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    content_report_id: created.content_report_id,
    action_type: created.action_type as "deleted" | "dismissed" | "escalated",
    action_notes: created.action_notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
