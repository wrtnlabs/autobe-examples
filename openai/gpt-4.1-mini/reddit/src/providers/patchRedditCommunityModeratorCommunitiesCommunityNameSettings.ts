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

export async function patchRedditCommunityModeratorCommunitiesCommunityNameSettings(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunitySettings.IUpdate;
}): Promise<IRedditCommunityCommunitySettings> {
  const { moderator, communityName, body } = props;

  // Step 1: Find community by unique name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  // Step 2: Check moderator membership in the community
  const membership =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: moderator.id,
      },
    });

  if (!membership) {
    throw new HttpException(
      "Forbidden: Moderator is not assigned to this community",
      403,
    );
  }

  // Step 3: Find existing setting by id and community id
  const setting =
    await MyGlobal.prisma.reddit_community_community_settings.findFirst({
      where: {
        id: body.id,
        reddit_community_community_id: community.id,
      },
    });

  if (!setting) {
    throw new HttpException(`Community setting not found: ${body.id}`, 404);
  }

  // Step 4: Update setting with patch data
  const updated =
    await MyGlobal.prisma.reddit_community_community_settings.update({
      where: { id: body.id },
      data: {
        reddit_community_community_id:
          body.reddit_community_community_id ?? undefined,
        setting_key: body.setting_key ?? undefined,
        setting_value:
          body.setting_value !== undefined ? body.setting_value : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 5: Return updated setting with proper date conversion
  return {
    id: updated.id,
    reddit_community_community_id: updated.reddit_community_community_id,
    setting_key: updated.setting_key,
    setting_value: updated.setting_value ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
