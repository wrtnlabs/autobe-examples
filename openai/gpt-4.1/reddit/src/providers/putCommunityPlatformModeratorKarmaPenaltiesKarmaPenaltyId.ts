import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorKarmaPenaltiesKarmaPenaltyId(props: {
  moderator: ModeratorPayload;
  karmaPenaltyId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaPenalty.IUpdate;
}): Promise<ICommunityPlatformKarmaPenalty> {
  const { moderator, karmaPenaltyId, body } = props;
  // 1. Fetch penalty; 404 if not found.
  const penalty =
    await MyGlobal.prisma.community_platform_karma_penalties.findUnique({
      where: { id: karmaPenaltyId },
    });
  if (!penalty) throw new HttpException("Karma penalty not found", 404);

  // 2. OPTIONAL: Authorization - moderator must at least be active (already verified by moderator auth decorator)
  // (Advanced: Check against penalty.community_platform_community_id for finer-grained enforcement.)

  // 3. Prepare update data with only fields present in body
  await MyGlobal.prisma.community_platform_karma_penalties.update({
    where: { id: karmaPenaltyId },
    data: {
      penalty_type:
        body.penalty_type !== undefined ? body.penalty_type : undefined,
      penalty_value:
        body.penalty_value !== undefined ? body.penalty_value : undefined,
      penalty_reason:
        body.penalty_reason !== undefined ? body.penalty_reason : undefined,
      penalty_status:
        body.penalty_status !== undefined ? body.penalty_status : undefined,
      applied_at: body.applied_at !== undefined ? body.applied_at : undefined,
      expires_at:
        body.expires_at !== undefined
          ? body.expires_at === null
            ? null
            : body.expires_at
          : undefined,
      // removed updated_at field to match Prisma allowed fields
    },
  });

  // 4. Fetch updated penalty to respond with full record
  const updated =
    await MyGlobal.prisma.community_platform_karma_penalties.findUniqueOrThrow({
      where: { id: karmaPenaltyId },
    });
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id:
      updated.community_platform_community_id === null
        ? undefined
        : updated.community_platform_community_id,
    penalty_type: updated.penalty_type,
    penalty_value: updated.penalty_value,
    penalty_reason: updated.penalty_reason,
    penalty_status: updated.penalty_status,
    applied_at: toISOStringSafe(updated.applied_at),
    expires_at:
      updated.expires_at === null || updated.expires_at === undefined
        ? undefined
        : toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
