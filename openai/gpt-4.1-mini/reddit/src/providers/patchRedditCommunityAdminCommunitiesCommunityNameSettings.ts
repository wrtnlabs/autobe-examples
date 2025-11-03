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

export async function patchRedditCommunityAdminCommunitiesCommunityNameSettings(props: {
  admin: AdminPayload;
  communityName: string;
  body: IRedditCommunityCommunitySettings.IUpdate;
}): Promise<IRedditCommunityCommunitySettings> {
  const { admin, communityName, body } = props;

  // Step 1: Find community by name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });

  if (!community) {
    throw new HttpException(`Community not found: ${communityName}`, 404);
  }

  // Step 2: Find existing community setting by id
  const setting =
    await MyGlobal.prisma.reddit_community_community_settings.findUnique({
      where: { id: body.id },
    });

  if (!setting) {
    throw new HttpException(`Community setting not found: ${body.id}`, 404);
  }

  // Step 3: Verify the setting belongs to the found community
  if (setting.reddit_community_community_id !== community.id) {
    throw new HttpException(`Setting does not belong to the community`, 403);
  }

  // Step 4: Update the setting
  const updated =
    await MyGlobal.prisma.reddit_community_community_settings.update({
      where: { id: body.id },
      data: {
        reddit_community_community_id:
          body.reddit_community_community_id ?? undefined,
        setting_key: body.setting_key ?? undefined,
        setting_value: body.setting_value ?? undefined,
      },
    });

  // Step 5: Return updated record with correct date strings
  return {
    id: updated.id,
    reddit_community_community_id: updated.reddit_community_community_id,
    setting_key: updated.setting_key,
    setting_value: updated.setting_value ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
