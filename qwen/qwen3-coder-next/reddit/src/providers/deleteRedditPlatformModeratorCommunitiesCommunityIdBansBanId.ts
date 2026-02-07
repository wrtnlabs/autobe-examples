import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformModeratorCommunitiesCommunityIdBansBanId(props: {
  moderator: ModeratorPayload;
  communityId: string;
  banId: string;
}): Promise<void> {
  // Find the ban record and verify it belongs to the specified community
  const ban = await MyGlobal.prisma.reddit_platform_bans.findFirst({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  if (ban === null) {
    throw new HttpException("Not found", 404);
  }
  // Check if moderator has moderator or owner access to the community
  const access =
    await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (access === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Remove the ban record permanently
  await MyGlobal.prisma.reddit_platform_bans.delete({
    where: {
      id: props.banId,
    },
  });
}
