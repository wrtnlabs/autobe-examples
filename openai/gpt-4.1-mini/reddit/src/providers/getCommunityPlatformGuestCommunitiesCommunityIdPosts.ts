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

export async function getCommunityPlatformGuestCommunitiesCommunityIdPosts(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { community_id: props.communityId, deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      author_user_id: true,
      author_moderator_id: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  const data = posts.map((post) => {
    // Username cannot be retrieved from nested relation in Prisma query,
    // so assign empty string
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      created_at: toISOStringSafe(post.created_at),
      username: "",
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
