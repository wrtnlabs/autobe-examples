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

export async function putCommunityPlatformUserUsersUserIdProfileDisplayMetricsProfileDisplayMetricsId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileDisplayMetricsId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileDisplayMetric.IUpdate;
}): Promise<ICommunityPlatformProfileDisplayMetric> {
  // 1. Lookup: Ensure the record exists for the user and is not soft-deleted
  const existing =
    await MyGlobal.prisma.community_platform_profile_display_metrics.findFirst({
      where: {
        id: props.profileDisplayMetricsId,
        community_platform_user_id: props.userId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException("Profile display metrics record not found.", 404);
  }
  // 2. Execute update with direct inline data (PATCH semantics)
  const updated =
    await MyGlobal.prisma.community_platform_profile_display_metrics.update({
      where: {
        id: props.profileDisplayMetricsId,
      },
      data: {
        ...(typeof props.body.profile_view_count === "number"
          ? props.body.profile_view_count < 0
            ? (() => {
                throw new HttpException(
                  "profile_view_count must be non-negative.",
                  400,
                );
              })()
            : { profile_view_count: props.body.profile_view_count }
          : {}),
        ...(typeof props.body.impression_count === "number"
          ? props.body.impression_count < 0
            ? (() => {
                throw new HttpException(
                  "impression_count must be non-negative.",
                  400,
                );
              })()
            : { impression_count: props.body.impression_count }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(props.body, "last_viewed_at")
          ? { last_viewed_at: props.body.last_viewed_at ?? null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(
          props.body,
          "last_interaction_session_id",
        )
          ? {
              last_interaction_session_id:
                props.body.last_interaction_session_id ?? null,
            }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // 3. Return API DTO, always matching null/undefined requirements from interface
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    profile_view_count: updated.profile_view_count,
    impression_count: updated.impression_count,
    last_viewed_at: Object.prototype.hasOwnProperty.call(
      updated,
      "last_viewed_at",
    )
      ? updated.last_viewed_at == null
        ? updated.last_viewed_at
        : toISOStringSafe(updated.last_viewed_at)
      : undefined,
    last_interaction_session_id: Object.prototype.hasOwnProperty.call(
      updated,
      "last_interaction_session_id",
    )
      ? updated.last_interaction_session_id === null
        ? null
        : updated.last_interaction_session_id
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at == null
        ? updated.deleted_at
        : toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
