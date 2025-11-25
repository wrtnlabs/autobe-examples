import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModeratorsModeratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModeratorProfile> {
  const profile =
    await MyGlobal.prisma.community_platform_moderator_profiles.findFirst({
      where: {
        id: props.profileId,
        community_platform_moderator_id: props.moderatorId,
      },
    });

  if (!profile) {
    throw new HttpException(
      "Moderator profile not found for given moderator/profile IDs.",
      404,
    );
  }

  return {
    id: profile.id,
    community_platform_moderator_id: profile.community_platform_moderator_id,
    display_username: profile.display_username,
    avatar_uri:
      profile.avatar_uri === null ? null : (profile.avatar_uri ?? undefined),
    bio: profile.bio === null ? null : (profile.bio ?? undefined),
    status: profile.status,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at:
      profile.deleted_at === null
        ? null
        : typeof profile.deleted_at === "undefined"
          ? undefined
          : toISOStringSafe(profile.deleted_at),
  };
}
