import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
        community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_by: true,
        deleted_at: true,
        expires_at: true,
      },
    });
  const isOwner = await MyGlobal.prisma.reddit_platform_communities.findFirst({
    where: {
      id: props.communityId,
      owner_id: props.admin.id,
    },
    select: { id: true },
  });
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
      select: { id: true },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
