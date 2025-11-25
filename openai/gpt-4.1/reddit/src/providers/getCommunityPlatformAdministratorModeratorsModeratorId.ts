import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModeratorsModeratorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  // Not found or soft-deleted
  if (!moderator || moderator.deleted_at !== null) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: moderator.id,
    email: moderator.email,
    status: moderator.status,
    business_status: moderator.business_status ?? undefined,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.deleted_at !== null
        ? toISOStringSafe(moderator.deleted_at)
        : undefined,
  };
}
