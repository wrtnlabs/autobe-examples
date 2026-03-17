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

export async function patchRedditPlatformPosts(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Validate time_filter when sort_by is 'top'
  if (props.body.sort_by === "top" && !props.body.time_filter) {
    throw new HttpException(
      "time_filter is required when sort_by is 'top'",
      400,
    );
  }
  // Build where clause for soft-deleted posts
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { text_content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Build orderBy based on sort_by parameter
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput =
    props.body.sort_by === "new"
      ? {
          created_at: "desc",
        }
      : props.body.sort_by === "top"
        ? {
            created_at: "desc",
          }
        : props.body.sort_by === "controversial"
          ? {
              created_at: "desc",
            }
          : {
              created_at: "desc",
            }; // hot default
  // Execute findMany query
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Transform posts to response DTOs
  const data = await Promise.all(
    posts.map((post) => RedditPlatformPostAtSummaryTransformer.transform(post)),
  );
  // Build pagination response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
