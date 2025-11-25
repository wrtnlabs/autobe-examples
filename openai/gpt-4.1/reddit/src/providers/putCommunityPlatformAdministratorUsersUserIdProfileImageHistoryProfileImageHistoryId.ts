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

export async function putCommunityPlatformAdministratorUsersUserIdProfileImageHistoryProfileImageHistoryId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  profileImageHistoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileImageHistory.IUpdate;
}): Promise<ICommunityPlatformProfileImageHistory> {
  // 1. Fetch the existing record for given user and profileImageHistoryId.
  const existing =
    await MyGlobal.prisma.community_platform_profile_image_history.findFirst({
      where: {
        id: props.profileImageHistoryId,
        community_platform_user_id: props.userId,
      },
    });
  if (!existing) {
    throw new HttpException("Profile image history record not found.", 404);
  }

  // 2. Prepare update data from props.body, observing proper null vs undefined contract
  const updateData: Record<string, unknown> = {
    effective_from: props.body.effective_from,
  };
  if ("removed_at" in props.body) {
    updateData.removed_at =
      props.body.removed_at === undefined ? null : props.body.removed_at;
  }
  if ("deleted_at" in props.body) {
    updateData.deleted_at =
      props.body.deleted_at === undefined ? null : props.body.deleted_at;
  }

  const updated =
    await MyGlobal.prisma.community_platform_profile_image_history.update({
      where: { id: props.profileImageHistoryId },
      data: updateData,
    });

  // 3. Compose the DTO, careful with undefined/null distinction according to type
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    image_uri: updated.image_uri,
    uploaded_at: toISOStringSafe(updated.uploaded_at),
    effective_from: toISOStringSafe(updated.effective_from),
    removed_at:
      typeof updated.removed_at === "string"
        ? updated.removed_at
        : updated.removed_at === null
          ? null
          : undefined,
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
