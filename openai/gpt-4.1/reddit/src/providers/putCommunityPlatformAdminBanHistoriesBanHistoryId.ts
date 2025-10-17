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

export async function putCommunityPlatformAdminBanHistoriesBanHistoryId(props: {
  admin: AdminPayload;
  banHistoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBanHistory.IUpdate;
}): Promise<ICommunityPlatformBanHistory> {
  const { banHistoryId, body } = props;
  // Fetch current record
  const existing =
    await MyGlobal.prisma.community_platform_ban_histories.findUnique({
      where: { id: banHistoryId },
    });
  if (!existing) throw new HttpException("Ban history not found", 404);
  // If attempting to set ban active with a past ban_end_at, block
  const willBeActive = body.is_active ?? existing.is_active;
  // ban_end_at: if explicitly set or about to be active, check rule.
  if (
    willBeActive &&
    (body.ban_end_at !== undefined ? body.ban_end_at : existing.ban_end_at)
  ) {
    const end =
      body.ban_end_at !== undefined ? body.ban_end_at : existing.ban_end_at;
    // Only validate non-null end
    if (end && new Date(end).getTime() < Date.now()) {
      throw new HttpException(
        "Cannot mark ban as active when ban_end_at is in the past",
        400,
      );
    }
  }
  const updated = await MyGlobal.prisma.community_platform_ban_histories.update(
    {
      where: { id: banHistoryId },
      data: {
        reason: body.reason ?? undefined,
        ban_type: body.ban_type ?? undefined,
        is_active: body.is_active ?? undefined,
        ban_end_at: body.ban_end_at !== undefined ? body.ban_end_at : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return {
    id: updated.id,
    banned_member_id: updated.banned_member_id,
    issued_by_id: updated.issued_by_id,
    community_id: updated.community_id ?? null,
    triggering_report_id: updated.triggering_report_id ?? null,
    reason: updated.reason,
    ban_type: updated.ban_type,
    ban_start_at: toISOStringSafe(updated.ban_start_at),
    ban_end_at:
      updated.ban_end_at !== null && updated.ban_end_at !== undefined
        ? toISOStringSafe(updated.ban_end_at)
        : null,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
