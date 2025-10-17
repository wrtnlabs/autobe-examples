import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaThresholds";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminKarmaThresholdsKarmaThresholdId(props: {
  admin: AdminPayload;
  karmaThresholdId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaThresholds> {
  const threshold =
    await MyGlobal.prisma.community_platform_karma_thresholds.findUnique({
      where: { id: props.karmaThresholdId },
    });
  if (!threshold) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: threshold.id,
    community_platform_community_id:
      threshold.community_platform_community_id === null
        ? null
        : threshold.community_platform_community_id,
    threshold_type: threshold.threshold_type,
    threshold_value: threshold.threshold_value,
    feature_lock_reason:
      threshold.feature_lock_reason === undefined
        ? undefined
        : threshold.feature_lock_reason === null
          ? null
          : threshold.feature_lock_reason,
    created_at: toISOStringSafe(threshold.created_at),
    deleted_at:
      threshold.deleted_at === undefined
        ? undefined
        : threshold.deleted_at === null
          ? null
          : toISOStringSafe(threshold.deleted_at),
  };
}
