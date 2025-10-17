import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaAward } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAward";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminKarmaAwardsKarmaAwardId(props: {
  admin: AdminPayload;
  karmaAwardId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaAward.IUpdate;
}): Promise<ICommunityPlatformKarmaAward> {
  // 1. Lookup award record by ID (404 if not exists)
  const found =
    await MyGlobal.prisma.community_platform_karma_awards.findUnique({
      where: { id: props.karmaAwardId },
    });
  if (!found) {
    throw new HttpException("Award not found", 404);
  }

  // 2. Prepare update fields per supplied body (mapping revoked_at to deleted_at)
  const {
    award_reason,
    award_type,
    community_platform_community_id,
    event_time,
    revoked_at,
  } = props.body;
  const updateFields = {
    ...(award_reason !== undefined && { award_reason }),
    ...(award_type !== undefined && { award_type }),
    ...(community_platform_community_id !== undefined && {
      community_platform_community_id,
    }),
    ...(event_time !== undefined && { event_time: event_time }),
    ...(revoked_at !== undefined && { deleted_at: revoked_at }),
  };
  const updated = await MyGlobal.prisma.community_platform_karma_awards.update({
    where: { id: props.karmaAwardId },
    data: updateFields,
  });

  // 3. Return full DTO, formatting all types per DTO signature
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id:
      updated.community_platform_community_id ?? undefined,
    award_type: updated.award_type,
    award_reason: updated.award_reason ?? undefined,
    event_time: toISOStringSafe(updated.event_time),
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
