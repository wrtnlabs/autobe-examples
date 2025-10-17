import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfile.IUpdate;
}): Promise<ICommunityPlatformProfile> {
  // 1. Fetch profile by ID
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
  });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }

  // 2. Only the owner may edit their own profile (self-edit)
  if (profile.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to edit this profile",
      403,
    );
  }

  // 3. If username is changing, check for uniqueness (exclude self)
  if (props.body.username !== undefined) {
    const existing =
      await MyGlobal.prisma.community_platform_profiles.findFirst({
        where: {
          username: props.body.username,
          id: { not: props.profileId },
          deleted_at: null,
        },
      });
    if (existing) {
      throw new HttpException("Username is already taken.", 409);
    }
  }

  // 4. Update profile fields (only provided values)
  const updates = {
    username: props.body.username,
    bio: props.body.bio,
    avatar_uri: props.body.avatar_uri,
    display_email: props.body.display_email,
    status_message: props.body.status_message,
    is_public: props.body.is_public,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.community_platform_profiles.update({
    where: { id: props.profileId },
    data: updates,
  });

  // 5. Return updated profile with correct null/undefined handling
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    username: updated.username,
    bio: updated.bio !== null ? updated.bio : undefined,
    avatar_uri: updated.avatar_uri !== null ? updated.avatar_uri : undefined,
    display_email:
      updated.display_email !== null ? updated.display_email : undefined,
    status_message:
      updated.status_message !== null ? updated.status_message : undefined,
    is_public: updated.is_public,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
