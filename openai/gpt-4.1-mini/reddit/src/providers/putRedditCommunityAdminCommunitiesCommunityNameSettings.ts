import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminCommunitiesCommunityNameSettings(props: {
  admin: AdminPayload;
  communityName: string;
  body: IRedditCommunityCommunitySettings.ICreate;
}): Promise<IRedditCommunityCommunitySettings> {
  const { admin, communityName, body } = props;

  // Step 1: Find community by unique name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException("Not Found: Community does not exist", 404);
  }

  // Step 2: Delete existing settings with the same setting_key for this community
  await MyGlobal.prisma.reddit_community_community_settings.deleteMany({
    where: {
      reddit_community_community_id: community.id,
      setting_key: body.setting_key,
    },
  });

  // Step 3: Create new setting record
  const newSetting =
    await MyGlobal.prisma.reddit_community_community_settings.create({
      data: {
        id: v4(),
        reddit_community_community_id: community.id,
        setting_key: body.setting_key,
        setting_value: body.setting_value ?? null,
        created_at: toISOStringSafe(body.created_at),
        updated_at: toISOStringSafe(body.updated_at),
      },
    });

  // Step 4: Return the created setting with date strings
  return {
    id: newSetting.id,
    reddit_community_community_id: newSetting.reddit_community_community_id,
    setting_key: newSetting.setting_key,
    setting_value: newSetting.setting_value ?? null,
    created_at: toISOStringSafe(newSetting.created_at),
    updated_at: toISOStringSafe(newSetting.updated_at),
  };
}
