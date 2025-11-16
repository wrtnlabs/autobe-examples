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

export async function putCommunityPlatformUserUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileImageHistoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.IUpdate;
}): Promise<ICommunityPlatformProfileImageHistory> {
  const record =
    await MyGlobal.prisma.community_platform_profile_image_history.findUnique({
      where: { id: props.profileImageHistoryId },
    });
  if (!record || record.community_platform_user_id !== props.userId) {
    throw new HttpException(
      "Profile image history record not found for this user.",
      404,
    );
  }
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "You do not have permission to update this record.",
      403,
    );
  }
  const updated =
    await MyGlobal.prisma.community_platform_profile_image_history.update({
      where: { id: props.profileImageHistoryId },
      data: {
        effective_from: props.body.effective_from,
        ...(Object.prototype.hasOwnProperty.call(props.body, "removed_at")
          ? { removed_at: props.body.removed_at }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(props.body, "deleted_at")
          ? { deleted_at: props.body.deleted_at }
          : {}),
      },
    });
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    image_uri: updated.image_uri,
    uploaded_at: toISOStringSafe(updated.uploaded_at),
    effective_from: toISOStringSafe(updated.effective_from),
    removed_at:
      updated.removed_at !== null ? toISOStringSafe(updated.removed_at) : null,
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
