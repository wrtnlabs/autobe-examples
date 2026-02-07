import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPosts(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Fetch posts with pagination
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { vote_score: "desc" },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: { deleted_at: null },
  });
  // Transform to summary format
  const transformedData: IRedditPlatformPost.ISummary[] = data.map((post) => ({
    id: post.id as string & tags.Format<"uuid">,
    title: post.title,
    community_id: post.community_id,
    author_id: post.author_id,
    vote_score: post.vote_score,
    comment_count: post.comment_count,
    created_at: toISOStringSafe(post.created_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
