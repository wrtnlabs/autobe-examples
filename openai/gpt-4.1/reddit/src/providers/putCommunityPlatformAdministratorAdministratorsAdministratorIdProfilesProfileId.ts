import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorAdministratorsAdministratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdministratorProfile.IUpdate;
}): Promise<ICommunityPlatformAdministratorProfile> {
  // 1. Confirm administrator exists and is active & not deleted
  const admin =
    await MyGlobal.prisma.community_platform_administrators.findUnique({
      where: { id: props.administratorId, deleted_at: null, status: "active" },
    });
  if (!admin) {
    throw new HttpException("Administrator not found or access revoked.", 404);
  }

  // 2. Find the profile
  const profile =
    await MyGlobal.prisma.community_platform_administrator_profiles.findUnique({
      where: { id: props.profileId },
    });
  if (
    !profile ||
    profile.deleted_at !== null ||
    profile.community_platform_administrator_id !== props.administratorId
  ) {
    throw new HttpException(
      "Profile not found or does not belong to specified administrator.",
      404,
    );
  }

  // 3. If updating display_username, check for uniqueness
  if (
    props.body.display_username !== undefined &&
    props.body.display_username !== profile.display_username
  ) {
    const exists =
      await MyGlobal.prisma.community_platform_administrator_profiles.findFirst(
        {
          where: {
            display_username: props.body.display_username,
            id: { not: props.profileId },
          },
        },
      );
    if (exists) {
      throw new HttpException(
        "Display username already in use by another administrator.",
        409,
      );
    }
  }

  // 4. Prepare payload with allowed fields only
  const data: Record<string, unknown> = {
    ...(props.body.display_username !== undefined && {
      display_username: props.body.display_username,
    }),
    ...(props.body.avatar_uri !== undefined && {
      avatar_uri: props.body.avatar_uri,
    }),
    ...(props.body.bio !== undefined && { bio: props.body.bio }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.community_platform_administrator_profiles.update({
      where: { id: props.profileId },
      data,
    });

  return {
    id: updated.id,
    community_platform_administrator_id:
      updated.community_platform_administrator_id,
    display_username: updated.display_username,
    avatar_uri:
      updated.avatar_uri === null
        ? null
        : updated.avatar_uri === undefined
          ? undefined
          : updated.avatar_uri,
    bio:
      updated.bio === null
        ? null
        : updated.bio === undefined
          ? undefined
          : updated.bio,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at === undefined
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
