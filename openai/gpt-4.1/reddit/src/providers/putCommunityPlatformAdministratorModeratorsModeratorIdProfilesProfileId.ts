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

export async function putCommunityPlatformAdministratorModeratorsModeratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorProfile.IUpdate;
}): Promise<ICommunityPlatformModeratorProfile> {
  const profile =
    await MyGlobal.prisma.community_platform_moderator_profiles.findFirst({
      where: {
        id: props.profileId,
        community_platform_moderator_id: props.moderatorId,
        deleted_at: null,
      },
    });
  if (!profile) {
    throw new HttpException(
      "Moderator profile not found for this moderator or has been deleted.",
      404,
    );
  }
  if (typeof props.body.display_username === "string") {
    const usernameConflict =
      await MyGlobal.prisma.community_platform_moderator_profiles.findFirst({
        where: {
          display_username: props.body.display_username,
          id: { not: props.profileId },
        },
      });
    if (usernameConflict) {
      throw new HttpException(
        "Display username already in use by another moderator profile.",
        409,
      );
    }
  }
  const updated =
    await MyGlobal.prisma.community_platform_moderator_profiles.update({
      where: { id: props.profileId },
      data: {
        ...(typeof props.body.display_username !== "undefined" && {
          display_username: props.body.display_username,
        }),
        ...(typeof props.body.avatar_uri !== "undefined" && {
          avatar_uri: props.body.avatar_uri,
        }),
        ...(typeof props.body.bio !== "undefined" && { bio: props.body.bio }),
        ...(typeof props.body.status !== "undefined" && {
          status: props.body.status,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    community_platform_moderator_id: updated.community_platform_moderator_id,
    display_username: updated.display_username,
    avatar_uri:
      typeof updated.avatar_uri !== "undefined"
        ? updated.avatar_uri
        : undefined,
    bio: typeof updated.bio !== "undefined" ? updated.bio : undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at !== "undefined"
        ? updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
