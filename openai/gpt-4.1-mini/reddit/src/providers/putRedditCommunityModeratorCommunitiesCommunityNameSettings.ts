import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySettings";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditCommunityModeratorCommunitiesCommunityNameSettings(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunitySettings.ICreate;
}): Promise<IRedditCommunityCommunitySettings> {
  const { moderator, communityName, body } = props;

  // Find the community by unique name or throw 404
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { name: communityName },
    });

  // Delete all existing settings for this community
  await MyGlobal.prisma.reddit_community_community_settings.deleteMany({
    where: { reddit_community_community_id: community.id },
  });

  // Insert the new setting
  const created =
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

  // Return newly created setting
  return {
    id: created.id,
    reddit_community_community_id: created.reddit_community_community_id,
    setting_key: created.setting_key,
    setting_value: created.setting_value ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
