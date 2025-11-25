import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";

export async function getCommunityPlatformCommunitiesCommunityNameSettings(props: {
  communityName: string;
}): Promise<ICommunityPlatformCommunitySettings> {
  // 1. Find the community platform community by unique name (slug)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: props.communityName },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Fetch the community's settings via 1:1 relation
  const settings =
    await MyGlobal.prisma.community_platform_community_settings.findUnique({
      where: { community_platform_community_id: community.id },
    });
  if (!settings) {
    throw new HttpException("Settings not found for this community", 404);
  }
  // 3. Build DTO
  return {
    id: settings.id,
    community_platform_community_id: settings.community_platform_community_id,
    allow_posting: settings.allow_posting,
    submission_type: settings.submission_type,
    default_sort: settings.default_sort,
    appearance_theme:
      settings.appearance_theme === null
        ? undefined
        : settings.appearance_theme,
    created_at: toISOStringSafe(settings.created_at),
    updated_at: toISOStringSafe(settings.updated_at),
  };
}
