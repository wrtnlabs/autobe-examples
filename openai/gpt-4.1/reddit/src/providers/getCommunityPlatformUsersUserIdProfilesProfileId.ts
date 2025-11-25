import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function getCommunityPlatformUsersUserIdProfilesProfileId(props: {
  userId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserProfile> {
  const profile =
    await MyGlobal.prisma.community_platform_user_profiles.findUnique({
      where: { id: props.profileId },
    });

  if (
    !profile ||
    profile.community_platform_user_id !== props.userId ||
    profile.deleted_at !== null
  ) {
    throw new HttpException("Profile not found", 404);
  }

  return {
    id: profile.id,
    community_platform_user_id: profile.community_platform_user_id,
    display_username: profile.display_username,
    avatar_uri: profile.avatar_uri === null ? null : profile.avatar_uri,
    bio: profile.bio === null ? null : profile.bio,
    status: profile.status,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
    deleted_at:
      profile.deleted_at === null || profile.deleted_at === undefined
        ? undefined
        : toISOStringSafe(profile.deleted_at),
  };
}
