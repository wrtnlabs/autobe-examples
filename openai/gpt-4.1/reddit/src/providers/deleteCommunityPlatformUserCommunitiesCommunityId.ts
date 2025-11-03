import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  // 1. Find the community; ensure exists and not already archived
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community is already archived", 400);
  }

  // 2. Authorization: must be creator or active moderator
  const isCreator = community.creator_user_id === props.user.id;
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.user.id,
      },
    });
  if (!isCreator && !moderator) {
    throw new HttpException("Not authorized to archive this community", 403);
  }

  // 3. Prepare now timestamp
  const now = toISOStringSafe(new Date());

  // 4. Archive snapshot creation
  await MyGlobal.prisma.community_platform_community_archives.create({
    data: {
      id: v4(),
      community_platform_community_id: community.id,
      archived_by_user_id: props.user.id,
      archived_name: community.name,
      archived_description: community.description,
      archived_at: now,
    },
  });

  // 5. Update community (set deleted_at)
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: community.id },
    data: { deleted_at: now },
  });

  return {
    id: updated.id,
    creator_user_id: updated.creator_user_id,
    name: updated.name,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
