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

export async function getCommunityPlatformAdministratorContentQuarantinesContentQuarantineId(props: {
  administrator: AdministratorPayload;
  contentQuarantineId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformContentQuarantine> {
  const record =
    await MyGlobal.prisma.community_platform_content_quarantines.findUnique({
      where: { id: props.contentQuarantineId },
    });
  if (!record) {
    throw new HttpException("Content quarantine not found", 404);
  }
  return {
    id: record.id,
    quarantine_type: record.quarantine_type,
    status: record.status,
    start_at: toISOStringSafe(record.start_at),
    end_at:
      typeof record.end_at === "undefined"
        ? undefined
        : record.end_at === null
          ? null
          : toISOStringSafe(record.end_at),
    target_post_id:
      typeof record.target_post_id === "undefined"
        ? undefined
        : record.target_post_id === null
          ? null
          : record.target_post_id,
    target_comment_id:
      typeof record.target_comment_id === "undefined"
        ? undefined
        : record.target_comment_id === null
          ? null
          : record.target_comment_id,
    target_community_id:
      typeof record.target_community_id === "undefined"
        ? undefined
        : record.target_community_id === null
          ? null
          : record.target_community_id,
    moderation_action_id:
      typeof record.moderation_action_id === "undefined"
        ? undefined
        : record.moderation_action_id === null
          ? null
          : record.moderation_action_id,
    created_at: toISOStringSafe(record.created_at),
  };
}
