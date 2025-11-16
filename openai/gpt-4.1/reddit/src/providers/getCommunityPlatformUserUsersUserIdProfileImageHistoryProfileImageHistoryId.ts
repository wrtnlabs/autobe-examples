import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileImageHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfileImageHistory> {
  const record =
    await MyGlobal.prisma.community_platform_profile_image_history.findUnique({
      where: { id: props.profileImageHistoryId },
    });

  if (!record) {
    throw new HttpException("Profile image history record not found", 404);
  }

  if (
    record.community_platform_user_id !== props.userId ||
    record.community_platform_user_id !== props.user.id
  ) {
    throw new HttpException("Forbidden: access denied", 403);
  }

  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    image_uri: record.image_uri,
    uploaded_at: toISOStringSafe(record.uploaded_at),
    effective_from: toISOStringSafe(record.effective_from),
    removed_at:
      record.removed_at === null || typeof record.removed_at === "undefined"
        ? null
        : toISOStringSafe(record.removed_at),
    deleted_at:
      record.deleted_at === null || typeof record.deleted_at === "undefined"
        ? null
        : toISOStringSafe(record.deleted_at),
  };
}
