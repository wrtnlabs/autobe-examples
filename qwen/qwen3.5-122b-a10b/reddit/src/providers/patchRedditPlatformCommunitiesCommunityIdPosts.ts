import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Validate community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Build orderBy based on sort_by parameter
  const orderByInput =
    props.body.sort_by === "new"
      ? { created_at: "desc" as const }
      : props.body.sort_by === "top"
        ? {
            created_at: "desc" as const,
          }
        : { created_at: "desc" as const }; // default/hot/controversial fall back to new
  // Execute queries sequentially
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    } satisfies Prisma.reddit_platform_postsFindManyArgs),
    MyGlobal.prisma.reddit_platform_posts.count({
      where: whereInput,
    }),
  ]);
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      posts,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
