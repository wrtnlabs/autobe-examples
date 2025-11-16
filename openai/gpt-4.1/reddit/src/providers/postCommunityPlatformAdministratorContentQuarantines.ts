import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityPlatformAdministratorContentQuarantines(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformContentQuarantine.ICreate;
}): Promise<ICommunityPlatformContentQuarantine> {
  const now = toISOStringSafe(new Date());
  const result =
    await MyGlobal.prisma.community_platform_content_quarantines.create({
      data: {
        id: v4(),
        quarantine_type: props.body.quarantine_type,
        status: props.body.status,
        start_at: props.body.start_at,
        end_at: props.body.end_at !== undefined ? props.body.end_at : null,
        target_post_id:
          props.body.target_post_id !== undefined
            ? props.body.target_post_id
            : null,
        target_comment_id:
          props.body.target_comment_id !== undefined
            ? props.body.target_comment_id
            : null,
        target_community_id:
          props.body.target_community_id !== undefined
            ? props.body.target_community_id
            : null,
        moderation_action_id:
          props.body.moderation_action_id !== undefined
            ? props.body.moderation_action_id
            : null,
        created_at: now,
      },
    });
  return {
    id: result.id,
    quarantine_type: result.quarantine_type,
    status: result.status,
    start_at: toISOStringSafe(result.start_at),
    end_at: result.end_at != null ? toISOStringSafe(result.end_at) : undefined,
    target_post_id:
      result.target_post_id !== undefined ? result.target_post_id : undefined,
    target_comment_id:
      result.target_comment_id !== undefined
        ? result.target_comment_id
        : undefined,
    target_community_id:
      result.target_community_id !== undefined
        ? result.target_community_id
        : undefined,
    moderation_action_id:
      result.moderation_action_id !== undefined
        ? result.moderation_action_id
        : undefined,
    created_at: toISOStringSafe(result.created_at),
  };
}
