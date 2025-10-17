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

export async function getCommunityPlatformAdminKarmaPenaltiesKarmaPenaltyId(props: {
  admin: AdminPayload;
  karmaPenaltyId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaPenalty> {
  const penalty =
    await MyGlobal.prisma.community_platform_karma_penalties.findUnique({
      where: { id: props.karmaPenaltyId },
    });
  if (!penalty) {
    throw new HttpException("Penalty not found", 404);
  }

  return {
    id: penalty.id,
    community_platform_member_id: penalty.community_platform_member_id,
    community_platform_community_id:
      penalty.community_platform_community_id ?? undefined,
    penalty_type: penalty.penalty_type,
    penalty_value: penalty.penalty_value,
    penalty_reason: penalty.penalty_reason,
    penalty_status: penalty.penalty_status,
    applied_at: toISOStringSafe(penalty.applied_at),
    expires_at: penalty.expires_at
      ? toISOStringSafe(penalty.expires_at)
      : undefined,
    created_at: toISOStringSafe(penalty.created_at),
    deleted_at: penalty.deleted_at
      ? toISOStringSafe(penalty.deleted_at)
      : undefined,
  };
}
