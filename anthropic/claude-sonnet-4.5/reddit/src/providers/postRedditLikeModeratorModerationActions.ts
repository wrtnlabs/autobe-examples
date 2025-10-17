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

export async function postRedditLikeModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeModerationAction.ICreate;
}): Promise<IRedditLikeModerationAction> {
  const { moderator, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_like_moderation_actions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      report_id: body.report_id ?? null,
      moderator_id: moderator.id,
      admin_id: null,
      affected_post_id: body.affected_post_id ?? null,
      affected_comment_id: body.affected_comment_id ?? null,
      community_id: body.community_id,
      action_type: body.action_type,
      content_type: body.content_type,
      removal_type: body.removal_type ?? null,
      reason_category: body.reason_category,
      reason_text: body.reason_text,
      internal_notes: body.internal_notes ?? null,
      status: "completed",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    action_type: created.action_type,
    content_type: created.content_type,
    removal_type:
      created.removal_type === null ? undefined : created.removal_type,
    reason_category: created.reason_category,
    reason_text: created.reason_text,
    status: created.status,
    created_at: now,
  };
}
