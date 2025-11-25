import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileDisplayMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileDisplayMetric";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserIdProfileDisplayMetricsProfileDisplayMetricsId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileDisplayMetricsId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfileDisplayMetric> {
  // Enforce access control
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only fetch your own profile display metrics.",
      403,
    );
  }

  const metric =
    await MyGlobal.prisma.community_platform_profile_display_metrics.findFirst({
      where: {
        id: props.profileDisplayMetricsId,
        community_platform_user_id: props.userId,
        deleted_at: null,
      },
    });

  if (!metric) {
    throw new HttpException("Profile display metrics not found.", 404);
  }

  return {
    id: metric.id,
    community_platform_user_id: metric.community_platform_user_id,
    profile_view_count: metric.profile_view_count,
    impression_count: metric.impression_count,
    last_viewed_at: metric.last_viewed_at
      ? toISOStringSafe(metric.last_viewed_at)
      : typeof metric.last_viewed_at === "undefined"
        ? undefined
        : null,
    last_interaction_session_id:
      typeof metric.last_interaction_session_id === "undefined"
        ? undefined
        : (metric.last_interaction_session_id ?? null),
    created_at: toISOStringSafe(metric.created_at),
    updated_at: toISOStringSafe(metric.updated_at),
    deleted_at:
      typeof metric.deleted_at === "undefined"
        ? undefined
        : metric.deleted_at
          ? toISOStringSafe(metric.deleted_at)
          : null,
  };
}
