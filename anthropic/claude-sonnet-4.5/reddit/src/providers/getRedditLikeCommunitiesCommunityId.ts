import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";

export async function getRedditLikeCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunity> {
  const { communityId } = props;

  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: communityId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        icon_url: true,
        banner_url: true,
        privacy_type: true,
        posting_permission: true,
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: true,
        secondary_tags: true,
        subscriber_count: true,
        is_archived: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: community.id,
    code: community.code,
    name: community.name,
    description: community.description,
    icon_url: community.icon_url ?? undefined,
    banner_url: community.banner_url ?? undefined,
    privacy_type: community.privacy_type,
    posting_permission: community.posting_permission,
    allow_text_posts: community.allow_text_posts,
    allow_link_posts: community.allow_link_posts,
    allow_image_posts: community.allow_image_posts,
    primary_category: community.primary_category,
    secondary_tags: community.secondary_tags ?? undefined,
    subscriber_count: community.subscriber_count,
    is_archived: community.is_archived,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
  };
}
