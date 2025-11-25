import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorUsersUserIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserProfile.IUpdate;
}): Promise<ICommunityPlatformUserProfile> {
  const { userId, profileId, body } = props;
  // Check that user exists and is not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: userId, deleted_at: null },
  });
  if (!user) throw new HttpException("User not found", 404);

  // Check that profile exists and belongs to this user
  const profile =
    await MyGlobal.prisma.community_platform_user_profiles.findUnique({
      where: { id: profileId },
    });
  if (!profile || profile.community_platform_user_id !== userId)
    throw new HttpException(
      "Profile not found or does not belong to user",
      404,
    );

  // Enforce unique display_username if updating
  if (typeof body.display_username !== "undefined") {
    const duplicate =
      await MyGlobal.prisma.community_platform_user_profiles.findFirst({
        where: {
          display_username: body.display_username,
          id: { not: profileId },
        },
      });
    if (duplicate)
      throw new HttpException("Display username already in use", 409);
  }

  // Build update object for only updatable fields
  const data: any = {
    updated_at: toISOStringSafe(new Date()),
    ...(body.display_username !== undefined && {
      display_username: body.display_username,
    }),
    ...(body.avatar_uri !== undefined && { avatar_uri: body.avatar_uri }),
    ...(body.bio !== undefined && { bio: body.bio }),
    ...(body.status !== undefined && { status: body.status }),
  };

  const updated = await MyGlobal.prisma.community_platform_user_profiles.update(
    {
      where: { id: profileId },
      data,
    },
  );

  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    display_username: updated.display_username,
    avatar_uri:
      typeof updated.avatar_uri === "undefined"
        ? undefined
        : updated.avatar_uri === null
          ? null
          : updated.avatar_uri,
    bio:
      typeof updated.bio === "undefined"
        ? undefined
        : updated.bio === null
          ? null
          : updated.bio,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
