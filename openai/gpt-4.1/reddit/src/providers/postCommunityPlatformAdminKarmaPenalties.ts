import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminKarmaPenalties(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaPenalty.ICreate;
}): Promise<ICommunityPlatformKarmaPenalty> {
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_karma_penalties.create({
      data: {
        id: v4(),
        community_platform_member_id: props.body.community_platform_member_id,
        community_platform_community_id:
          props.body.community_platform_community_id ?? null,
        penalty_type: props.body.penalty_type,
        penalty_value: props.body.penalty_value,
        penalty_reason: props.body.penalty_reason,
        penalty_status: props.body.penalty_status,
        applied_at: toISOStringSafe(props.body.applied_at),
        expires_at:
          props.body.expires_at !== undefined
            ? props.body.expires_at === null
              ? null
              : toISOStringSafe(props.body.expires_at)
            : undefined,
        created_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    community_platform_member_id: created.community_platform_member_id,
    community_platform_community_id:
      created.community_platform_community_id ?? null,
    penalty_type: created.penalty_type,
    penalty_value: created.penalty_value,
    penalty_reason: created.penalty_reason,
    penalty_status: created.penalty_status,
    applied_at: toISOStringSafe(created.applied_at),
    expires_at:
      created.expires_at === null ? null : toISOStringSafe(created.expires_at),
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
