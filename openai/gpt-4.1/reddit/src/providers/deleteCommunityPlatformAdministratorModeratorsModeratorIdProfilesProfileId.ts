import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorModeratorsModeratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModeratorProfile> {
  const profile =
    await MyGlobal.prisma.community_platform_moderator_profiles.findUnique({
      where: { id: props.profileId },
    });

  if (
    !profile ||
    profile.community_platform_moderator_id !== props.moderatorId
  ) {
    throw new HttpException("Moderator profile not found", 404);
  }

  if (profile.deleted_at !== null) {
    throw new HttpException("Moderator profile already deleted", 404);
  }

  const deleted =
    await MyGlobal.prisma.community_platform_moderator_profiles.delete({
      where: { id: props.profileId },
    });

  return {
    id: deleted.id,
    community_platform_moderator_id: deleted.community_platform_moderator_id,
    display_username: deleted.display_username,
    avatar_uri: deleted.avatar_uri ?? undefined,
    bio: deleted.bio ?? undefined,
    status: deleted.status,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at
      ? toISOStringSafe(deleted.deleted_at)
      : undefined,
  };
}
