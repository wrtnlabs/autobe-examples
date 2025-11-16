import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserPrivacySettingsPrivacySettingsId(props: {
  user: UserPayload;
  privacySettingsId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Attempt to load the privacy settings record
  const record =
    await MyGlobal.prisma.community_platform_privacy_settings.findUnique({
      where: { id: props.privacySettingsId },
    });

  // If not found or already deleted, return 404
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Privacy settings not found.", 404);
  }

  // Check if actor is the owner of the settings
  const isOwner = record.community_platform_user_id === props.user.id;
  let isAdmin = false;

  // If not owner, check if this user is a platform admin with status active and not soft-deleted
  if (!isOwner) {
    const admin =
      await MyGlobal.prisma.community_platform_administrators.findUnique({
        where: { id: props.user.id },
        select: { id: true, status: true, deleted_at: true },
      });
    isAdmin = !!admin && admin.status === "active" && admin.deleted_at === null;
  }

  if (!isOwner && !isAdmin) {
    throw new HttpException(
      "Forbidden. You do not have permission to delete this privacy setting.",
      403,
    );
  }

  // Soft delete: set deleted_at
  await MyGlobal.prisma.community_platform_privacy_settings.update({
    where: { id: props.privacySettingsId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
