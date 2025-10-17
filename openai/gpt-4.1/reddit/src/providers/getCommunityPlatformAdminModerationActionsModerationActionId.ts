import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationAction> {
  const record =
    await MyGlobal.prisma.community_platform_moderation_actions.findUnique({
      where: {
        id: props.moderationActionId,
      },
    });
  if (!record) {
    throw new HttpException("Moderation action not found", 404);
  }
  return {
    id: record.id,
    actor_id: record.actor_id,
    target_post_id: record.target_post_id ?? undefined,
    target_comment_id: record.target_comment_id ?? undefined,
    report_id: record.report_id ?? undefined,
    action_type: record.action_type,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
