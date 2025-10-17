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

export async function getCommunityPlatformModeratorKarmaPenaltiesKarmaPenaltyId(props: {
  moderator: ModeratorPayload;
  karmaPenaltyId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaPenalty> {
  // 1. Fetch the penalty record
  const penalty =
    await MyGlobal.prisma.community_platform_karma_penalties.findUnique({
      where: { id: props.karmaPenaltyId },
    });
  if (!penalty) {
    throw new HttpException("Karma penalty not found", 404);
  }

  // 2. Moderator scope enforcement
  // If the penalty is for a specific community, moderator must be assigned to it
  let isAuthorized = false;

  if (
    penalty.community_platform_community_id !== null &&
    penalty.community_platform_community_id !== undefined
  ) {
    const assignment =
      await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
        {
          where: {
            member_id: props.moderator.id,
            community_id: penalty.community_platform_community_id,
            end_at: null,
          },
        },
      );
    if (assignment) isAuthorized = true;
  } else {
    // Global penalties: allow any active moderator (moderator assignment end_at null)
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          member_id: props.moderator.id,
          status: "active",
          deleted_at: null,
        },
      });
    if (moderator) isAuthorized = true;
  }

  if (!isAuthorized) {
    throw new HttpException(
      "Forbidden: Not authorized for this penalty's community",
      403,
    );
  }

  // 3. Return, transforming date fields, respecting nullability
  return {
    id: penalty.id,
    community_platform_member_id: penalty.community_platform_member_id,
    community_platform_community_id:
      penalty.community_platform_community_id ?? null,
    penalty_type: penalty.penalty_type,
    penalty_value: penalty.penalty_value,
    penalty_reason: penalty.penalty_reason,
    penalty_status: penalty.penalty_status,
    applied_at: toISOStringSafe(penalty.applied_at),
    expires_at:
      penalty.expires_at !== null && penalty.expires_at !== undefined
        ? toISOStringSafe(penalty.expires_at)
        : null,
    created_at: toISOStringSafe(penalty.created_at),
    deleted_at:
      penalty.deleted_at !== null && penalty.deleted_at !== undefined
        ? toISOStringSafe(penalty.deleted_at)
        : null,
  };
}
