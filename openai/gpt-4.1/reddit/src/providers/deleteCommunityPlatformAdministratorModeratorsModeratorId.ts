import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  // Step 1: Lookup target moderator by id
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found.", 404);
  }
  // Step 2: If already deleted
  if (moderator.deleted_at !== null) {
    throw new HttpException("Moderator is already deactivated.", 409);
  }

  // Step 3: Soft delete - update deleted_at and updated_at
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: { deleted_at: now, updated_at: now },
  });

  // Step 4: Map DB fields to API DTO, omitting sensitive/password fields
  return {
    id: updated.id,
    email: updated.email,
    status: updated.status,
    business_status:
      typeof updated.business_status !== "undefined"
        ? updated.business_status
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
