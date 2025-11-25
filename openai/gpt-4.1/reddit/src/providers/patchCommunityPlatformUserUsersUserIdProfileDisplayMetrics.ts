import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileDisplayMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileDisplayMetrics";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserUsersUserIdProfileDisplayMetrics(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileDisplayMetrics.IRequest;
}): Promise<ICommunityPlatformProfileDisplayMetrics> {
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const metrics =
    await MyGlobal.prisma.community_platform_profile_display_metrics.findUnique(
      {
        where: {
          community_platform_user_id: props.userId,
        },
      },
    );

  if (!metrics) {
    throw new HttpException("No display metrics found for user", 404);
  }

  return {
    id: metrics.id,
    community_platform_user_id: metrics.community_platform_user_id,
    profile_view_count: metrics.profile_view_count,
    impression_count: metrics.impression_count,
    last_viewed_at:
      metrics.last_viewed_at !== null && metrics.last_viewed_at !== undefined
        ? toISOStringSafe(metrics.last_viewed_at)
        : null,
    last_interaction_session_id:
      metrics.last_interaction_session_id !== null &&
      metrics.last_interaction_session_id !== undefined
        ? metrics.last_interaction_session_id
        : null,
    created_at: toISOStringSafe(metrics.created_at),
    updated_at: toISOStringSafe(metrics.updated_at),
    deleted_at:
      metrics.deleted_at !== null && metrics.deleted_at !== undefined
        ? toISOStringSafe(metrics.deleted_at)
        : null,
  };
}
