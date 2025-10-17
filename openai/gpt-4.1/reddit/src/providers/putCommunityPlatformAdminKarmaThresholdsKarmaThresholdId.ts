import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaThreshold } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThreshold";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminKarmaThresholdsKarmaThresholdId(props: {
  admin: AdminPayload;
  karmaThresholdId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaThreshold.IUpdate;
}): Promise<ICommunityPlatformKarmaThreshold> {
  // 1. Find existing threshold (must exist, handle 404)
  const existing =
    await MyGlobal.prisma.community_platform_karma_thresholds.findUnique({
      where: { id: props.karmaThresholdId },
    });
  if (!existing) {
    throw new HttpException("Karma threshold not found", 404);
  }

  // 2. If threshold_type is being updated, enforce unique constraint
  // Need to know current community id
  const proposedThresholdType =
    props.body.threshold_type ?? existing.threshold_type;
  const proposedCommunityId = existing.community_platform_community_id;
  // Check for any duplicate in [communityPlatformCommunityId, threshold_type] except current row
  const duplicate =
    await MyGlobal.prisma.community_platform_karma_thresholds.findFirst({
      where: {
        id: { not: props.karmaThresholdId },
        threshold_type: proposedThresholdType,
        community_platform_community_id: proposedCommunityId,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Duplicate threshold_type for this community or global scope is not allowed",
      409,
    );
  }

  // 3. Validate threshold_value if present
  if (
    props.body.threshold_value !== undefined &&
    (props.body.threshold_value < 0 || props.body.threshold_value > 99999)
  ) {
    throw new HttpException("Threshold value out of allowed range", 400);
  }

  // 4. Update
  const updated =
    await MyGlobal.prisma.community_platform_karma_thresholds.update({
      where: { id: props.karmaThresholdId },
      data: {
        threshold_type: props.body.threshold_type ?? undefined,
        threshold_value: props.body.threshold_value ?? undefined,
        feature_lock_reason:
          props.body.feature_lock_reason === undefined
            ? undefined
            : props.body.feature_lock_reason,
        // Not allowed to update id, created_at, deleted_at, community_platform_community_id
      },
    });

  // 5. Return API DTO
  return {
    id: updated.id,
    community_platform_community_id:
      updated.community_platform_community_id ?? undefined,
    threshold_type: updated.threshold_type,
    threshold_value: updated.threshold_value,
    feature_lock_reason: updated.feature_lock_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
