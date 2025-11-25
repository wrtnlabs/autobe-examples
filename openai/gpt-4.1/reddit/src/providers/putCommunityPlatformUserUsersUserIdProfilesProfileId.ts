import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserUsersUserIdProfilesProfileId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserProfile.IUpdate;
}): Promise<ICommunityPlatformUserProfile> {
  // 1. Check that user exists and is active
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
      status: "active",
    },
  });
  if (!user) {
    throw new HttpException("User not found or not active.", 404);
  }

  // 2. Check that the profile exists and belongs to the user
  const profile =
    await MyGlobal.prisma.community_platform_user_profiles.findUnique({
      where: {
        id: props.profileId,
      },
    });
  if (!profile || profile.community_platform_user_id !== props.userId) {
    throw new HttpException(
      "Profile not found or does not belong to user.",
      404,
    );
  }

  // 3. Only the user themself can update their profile
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: you may only update your own profile.",
      403,
    );
  }

  // 4. If display_username is being changed, check uniqueness
  if (
    props.body.display_username !== undefined &&
    props.body.display_username !== profile.display_username
  ) {
    const dup =
      await MyGlobal.prisma.community_platform_user_profiles.findUnique({
        where: {
          display_username: props.body.display_username,
        },
      });
    if (dup && dup.id !== props.profileId) {
      throw new HttpException("Display username already in use.", 409);
    }
  }

  // 5. Compose update fields from provided body (do not unset other fields)
  const update: Record<string, unknown> = {
    ...(props.body.display_username !== undefined && {
      display_username: props.body.display_username,
    }),
    ...("avatar_uri" in props.body && { avatar_uri: props.body.avatar_uri }),
    ...("bio" in props.body && { bio: props.body.bio }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.community_platform_user_profiles.update(
    {
      where: { id: props.profileId },
      data: update,
    },
  );

  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    display_username: updated.display_username,
    avatar_uri: Object.prototype.hasOwnProperty.call(updated, "avatar_uri")
      ? updated.avatar_uri
      : undefined,
    bio: Object.prototype.hasOwnProperty.call(updated, "bio")
      ? updated.bio
      : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null
      : undefined,
  };
}
