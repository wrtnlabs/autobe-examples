import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminModerationActions(props: {
  admin: AdminPayload;
  body: IRedditLikeModerationAction.ICreate;
}): Promise<IRedditLikeModerationAction> {
  const { admin, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_like_moderation_actions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      report_id: body.report_id ?? undefined,
      moderator_id: undefined,
      admin_id: admin.id,
      affected_post_id: body.affected_post_id ?? undefined,
      affected_comment_id: body.affected_comment_id ?? undefined,
      community_id: body.community_id,
      action_type: body.action_type,
      content_type: body.content_type,
      removal_type: body.removal_type ?? undefined,
      reason_category: body.reason_category,
      reason_text: body.reason_text,
      internal_notes: body.internal_notes ?? undefined,
      status: "completed",
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    action_type: created.action_type,
    content_type: created.content_type,
    removal_type: created.removal_type ?? undefined,
    reason_category: created.reason_category,
    reason_text: created.reason_text,
    status: created.status,
    created_at: now,
  };
}
