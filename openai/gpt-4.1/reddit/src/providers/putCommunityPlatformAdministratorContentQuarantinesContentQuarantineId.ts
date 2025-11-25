import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorContentQuarantinesContentQuarantineId(props: {
  administrator: AdministratorPayload;
  contentQuarantineId: string & tags.Format<"uuid">;
  body: ICommunityPlatformContentQuarantine.IUpdate;
}): Promise<ICommunityPlatformContentQuarantine> {
  const existing =
    await MyGlobal.prisma.community_platform_content_quarantines.findUnique({
      where: { id: props.contentQuarantineId },
    });

  if (!existing) {
    throw new HttpException("Content quarantine record not found", 404);
  }

  const updated =
    await MyGlobal.prisma.community_platform_content_quarantines.update({
      where: { id: props.contentQuarantineId },
      data: {
        ...(props.body.quarantine_type !== undefined && {
          quarantine_type: props.body.quarantine_type,
        }),
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.start_at !== undefined && {
          start_at: props.body.start_at,
        }),
        ...(props.body.end_at !== undefined && { end_at: props.body.end_at }),
        ...(props.body.target_post_id !== undefined && {
          target_post_id: props.body.target_post_id,
        }),
        ...(props.body.target_comment_id !== undefined && {
          target_comment_id: props.body.target_comment_id,
        }),
        ...(props.body.target_community_id !== undefined && {
          target_community_id: props.body.target_community_id,
        }),
        ...(props.body.moderation_action_id !== undefined && {
          moderation_action_id: props.body.moderation_action_id,
        }),
      },
    });

  // All returned date/datetime fields must be string & tags.Format<"date-time"> and not Date type
  return {
    id: updated.id,
    quarantine_type: updated.quarantine_type,
    status: updated.status,
    start_at: toISOStringSafe(updated.start_at),
    end_at:
      updated.end_at !== null && updated.end_at !== undefined
        ? toISOStringSafe(updated.end_at)
        : undefined,
    target_post_id: updated.target_post_id ?? undefined,
    target_comment_id: updated.target_comment_id ?? undefined,
    target_community_id: updated.target_community_id ?? undefined,
    moderation_action_id: updated.moderation_action_id ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
