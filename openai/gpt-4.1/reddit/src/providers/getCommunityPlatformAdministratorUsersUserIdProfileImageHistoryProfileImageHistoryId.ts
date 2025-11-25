import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  administrator: AdministratorPayload;
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
  if (record.community_platform_user_id !== props.userId) {
    throw new HttpException(
      "This record does not belong to specified user",
      403,
    );
  }
  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    image_uri: record.image_uri,
    uploaded_at: toISOStringSafe(record.uploaded_at),
    effective_from: toISOStringSafe(record.effective_from),
    removed_at: record.removed_at
      ? toISOStringSafe(record.removed_at)
      : undefined,
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
