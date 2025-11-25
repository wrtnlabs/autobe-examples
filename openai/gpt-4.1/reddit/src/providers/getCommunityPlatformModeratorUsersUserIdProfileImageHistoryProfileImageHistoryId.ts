import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  profileImageHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfileImageHistory> {
  const record =
    await MyGlobal.prisma.community_platform_profile_image_history.findFirst({
      where: {
        id: props.profileImageHistoryId,
        community_platform_user_id: props.userId,
      },
    });

  if (!record) {
    throw new HttpException(
      "Profile image history record not found for given userId and profileImageHistoryId.",
      404,
    );
  }

  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    image_uri: record.image_uri,
    uploaded_at: toISOStringSafe(record.uploaded_at),
    effective_from: toISOStringSafe(record.effective_from),
    removed_at:
      record.removed_at === null || record.removed_at === undefined
        ? null
        : toISOStringSafe(record.removed_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? null
        : toISOStringSafe(record.deleted_at),
  };
}
