import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityNameSettings(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: ICommunityPlatformCommunitySettings.IUpdate;
}): Promise<ICommunityPlatformCommunitySettings> {
  // Find the target community by unique name, ensure not soft deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.communityName, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Fetch settings record for the community
  const settings =
    await MyGlobal.prisma.community_platform_community_settings.findUnique({
      where: { community_platform_community_id: community.id },
    });
  if (!settings) {
    throw new HttpException("Settings not found for the community", 404);
  }

  // Set new values for fields; updated_at always forced to now
  const updateData = {
    allow_posting: props.body.allow_posting,
    submission_type: props.body.submission_type,
    default_sort: props.body.default_sort,
    // Only update appearance_theme if key is present; if omitted, keep existing
    ...(Object.prototype.hasOwnProperty.call(props.body, "appearance_theme")
      ? { appearance_theme: props.body.appearance_theme }
      : {}),
    updated_at: new Date(),
  };

  const updated =
    await MyGlobal.prisma.community_platform_community_settings.update({
      where: { id: settings.id },
      data: updateData,
    });

  return {
    id: updated.id,
    community_platform_community_id: updated.community_platform_community_id,
    allow_posting: updated.allow_posting,
    submission_type: updated.submission_type,
    default_sort: updated.default_sort,
    // Prisma returns null if set, otherwise value; always supply undefined if not present (not null)
    appearance_theme: Object.prototype.hasOwnProperty.call(
      updated,
      "appearance_theme",
    )
      ? updated.appearance_theme
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
