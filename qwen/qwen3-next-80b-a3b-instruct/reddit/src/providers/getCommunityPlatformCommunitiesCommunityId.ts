import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function getCommunityPlatformCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
    });

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    createdAt: toISOStringSafe(community.created_at) satisfies string as string,
    isPublic: community.is_public,
    nsfw: community.nsfw,
    postReviewMode: community.post_review_mode,
    commentReviewMode: community.comment_review_mode,
    memberCount: community.member_count,
    postCount: community.post_count,
  };
}
