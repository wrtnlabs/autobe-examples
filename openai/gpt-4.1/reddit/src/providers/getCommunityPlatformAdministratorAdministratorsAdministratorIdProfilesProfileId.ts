import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorProfile";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorAdministratorsAdministratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdministratorProfile> {
  const administrator =
    await MyGlobal.prisma.community_platform_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
        status: "active",
      },
    });

  if (!administrator) {
    throw new HttpException("Administrator not found or inactive.", 404);
  }

  const profile =
    await MyGlobal.prisma.community_platform_administrator_profiles.findFirst({
      where: {
        id: props.profileId,
        community_platform_administrator_id: props.administratorId,
        deleted_at: null,
        NOT: {
          status: "retired",
        },
      },
    });

  if (!profile) {
    throw new HttpException(
      "Administrator profile not found or not active.",
      404,
    );
  }

  return {
    id: profile.id,
    community_platform_administrator_id:
      profile.community_platform_administrator_id,
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
        : profile.deleted_at
          ? toISOStringSafe(profile.deleted_at)
          : undefined,
  };
}
