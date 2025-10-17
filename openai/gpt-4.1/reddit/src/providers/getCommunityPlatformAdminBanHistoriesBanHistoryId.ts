import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminBanHistoriesBanHistoryId(props: {
  admin: AdminPayload;
  banHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBanHistory> {
  const ban = await MyGlobal.prisma.community_platform_ban_histories.findUnique(
    {
      where: { id: props.banHistoryId },
    },
  );
  if (!ban) {
    throw new HttpException("Ban history not found", 404);
  }
  return {
    id: ban.id,
    banned_member_id: ban.banned_member_id,
    issued_by_id: ban.issued_by_id,
    community_id: ban.community_id === null ? null : ban.community_id,
    triggering_report_id:
      ban.triggering_report_id === null ? null : ban.triggering_report_id,
    reason: ban.reason,
    ban_type: ban.ban_type,
    ban_start_at: toISOStringSafe(ban.ban_start_at),
    ban_end_at: ban.ban_end_at ? toISOStringSafe(ban.ban_end_at) : null,
    is_active: ban.is_active,
    created_at: toISOStringSafe(ban.created_at),
    updated_at: toISOStringSafe(ban.updated_at),
  };
}
