import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestPostsFeedPopular(props: {
  guest: GuestPayload;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      updated_at: true,
      community_id: true,
      author_user_id: true,
      author_moderator_id: true,
    },
  });
  const data = posts.map((post) => {
    return {
      id: post.id,
      title: post.title,
      community_name: post.community_id,
      post_type: post.post_type,
      vote_score: 0,
      comment_count: 0,
      author_username: null,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
    };
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { deleted_at: null },
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
