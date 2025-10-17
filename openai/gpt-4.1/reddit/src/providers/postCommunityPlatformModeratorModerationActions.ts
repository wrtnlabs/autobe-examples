import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationAction.ICreate;
}): Promise<ICommunityPlatformModerationAction> {
  // Security: actor_id must match the authenticated moderator's member id
  if (props.body.actor_id !== props.moderator.id) {
    throw new HttpException(
      "actor_id mismatch: Cannot record moderation action for another user.",
      403,
    );
  }

  const id = v4();
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.community_platform_moderation_actions.create({
      data: {
        id: id,
        actor_id: props.body.actor_id,
        target_post_id: props.body.target_post_id ?? null,
        target_comment_id: props.body.target_comment_id ?? null,
        report_id: props.body.report_id ?? null,
        action_type: props.body.action_type,
        description: props.body.description ?? null,
        created_at: now,
      },
    });

  return {
    id: created.id,
    actor_id: created.actor_id,
    target_post_id:
      created.target_post_id === null ? undefined : created.target_post_id,
    target_comment_id:
      created.target_comment_id === null
        ? undefined
        : created.target_comment_id,
    report_id: created.report_id === null ? undefined : created.report_id,
    action_type: created.action_type,
    description: created.description === null ? undefined : created.description,
    created_at: toISOStringSafe(created.created_at),
  };
}
