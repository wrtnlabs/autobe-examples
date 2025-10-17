import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySettings.IUpdate;
}): Promise<ICommunityPlatformCommunitySettings> {
  // Verify the community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Verify the moderator has access to this community
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderator.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: props.communityId,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException(
      "Unauthorized: Not a moderator of this community",
      403,
    );
  }

  // Check if community settings already exist
  let settings =
    await MyGlobal.prisma.community_platform_community_settings.findUnique({
      where: { community_platform_community_id: props.communityId },
    });

  // If settings don't exist, create them
  if (!settings) {
    settings =
      await MyGlobal.prisma.community_platform_community_settings.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_platform_community_id: props.communityId,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          moderator_invite_only: false, // Default value as specified by API interface
          allow_self_post: true, // Default value as specified by API interface
        },
      });
  }

  // Update settings with provided data
  const updatedSettings =
    await MyGlobal.prisma.community_platform_community_settings.update({
      where: { id: settings.id },
      data: {
        title: props.body.title,
        banner_url: props.body.banner_url,
        icon_url: props.body.icon_url,
        rules: props.body.rules,
        moderator_invite_only: props.body.moderator_invite_only,
        allow_self_post: props.body.allow_self_post,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return using API interface directly
  return {
    id: updatedSettings.id,
    community_platform_community_id:
      updatedSettings.community_platform_community_id,
    title: updatedSettings.title ?? undefined,
    banner_url: updatedSettings.banner_url ?? undefined,
    icon_url: updatedSettings.icon_url ?? undefined,
    rules: updatedSettings.rules ?? undefined,
    moderator_invite_only: updatedSettings.moderator_invite_only,
    allow_self_post: updatedSettings.allow_self_post,
    created_at: toISOStringSafe(updatedSettings.created_at),
    updated_at: toISOStringSafe(updatedSettings.updated_at),
  };
}
