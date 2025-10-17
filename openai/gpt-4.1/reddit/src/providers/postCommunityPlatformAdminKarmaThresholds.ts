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

export async function postCommunityPlatformAdminKarmaThresholds(props: {
  admin: AdminPayload;
  body: ICommunityPlatformKarmaThresholds.ICreate;
}): Promise<ICommunityPlatformKarmaThresholds> {
  const { body } = props;
  const now = toISOStringSafe(new Date());

  // Uniqueness: (community_platform_community_id, threshold_type)
  const existing =
    await MyGlobal.prisma.community_platform_karma_thresholds.findFirst({
      where: {
        community_platform_community_id:
          body.community_platform_community_id === undefined
            ? null
            : body.community_platform_community_id,
        threshold_type: body.threshold_type,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "A karma threshold for this type and community already exists.",
      409,
    );
  }

  if (body.community_platform_community_id) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: body.community_platform_community_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!community) {
      throw new HttpException("Referenced community does not exist.", 400);
    }
  }

  const created =
    await MyGlobal.prisma.community_platform_karma_thresholds.create({
      data: {
        id: v4(),
        community_platform_community_id:
          body.community_platform_community_id === undefined
            ? null
            : body.community_platform_community_id,
        threshold_type: body.threshold_type,
        threshold_value: body.threshold_value,
        feature_lock_reason:
          body.feature_lock_reason === undefined
            ? null
            : body.feature_lock_reason,
        created_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    community_platform_community_id:
      created.community_platform_community_id === null
        ? null
        : created.community_platform_community_id,
    threshold_type: created.threshold_type,
    threshold_value: created.threshold_value,
    feature_lock_reason:
      created.feature_lock_reason === null
        ? undefined
        : created.feature_lock_reason,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === undefined || created.deleted_at === null
        ? null
        : toISOStringSafe(created.deleted_at),
  };
}
