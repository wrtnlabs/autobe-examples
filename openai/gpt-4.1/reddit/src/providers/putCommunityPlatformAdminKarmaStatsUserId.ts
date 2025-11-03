import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaStats } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaStats";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminKarmaStatsUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaStats.IUpdate;
}): Promise<ICommunityPlatformKarmaStats> {
  // Authorization: admin must exist and not be deleted (redundant if decorator, but double check)
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
    },
  );
  if (!adminRecord) {
    throw new HttpException("Admin not authorized or soft-deleted", 403);
  }

  // Business rule validation
  const {
    total_karma,
    post_karma,
    comment_karma,
    lifetime_karma,
    maximum_karma,
  } = props.body;
  if (
    total_karma < 0 ||
    post_karma < 0 ||
    comment_karma < 0 ||
    lifetime_karma < 0 ||
    maximum_karma < 0
  ) {
    throw new HttpException("Karma values must not be negative", 400);
  }
  if (post_karma + comment_karma > total_karma) {
    throw new HttpException(
      "Sum of post_karma and comment_karma cannot exceed total_karma",
      400,
    );
  }

  // Find the karma stats record for the user, throw not found if missing
  const existing =
    await MyGlobal.prisma.community_platform_karma_stats.findFirst({
      where: {
        community_platform_user_id: props.userId,
      },
    });
  if (!existing) {
    throw new HttpException("Karma stats for user not found", 404);
  }

  // Update the record
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_karma_stats.update({
    where: { id: existing.id },
    data: {
      community_platform_user_id: props.userId,
      total_karma,
      post_karma,
      comment_karma,
      lifetime_karma,
      maximum_karma,
      updated_at: now,
    },
  });

  // Write audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action: "karma_stats_update",
      target_type: "user_karma_stats",
      target_id: props.userId,
      metadata: JSON.stringify({
        stats_id: existing.id,
        values: {
          total_karma,
          post_karma,
          comment_karma,
          lifetime_karma,
          maximum_karma,
        },
      }),
      created_at: now,
    },
  });

  // Return as ICommunityPlatformKarmaStats
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    total_karma: updated.total_karma,
    post_karma: updated.post_karma,
    comment_karma: updated.comment_karma,
    lifetime_karma: updated.lifetime_karma,
    maximum_karma: updated.maximum_karma,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
