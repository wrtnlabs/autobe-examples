import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentPostAtSummaryTransformer } from "../transformers/RedditCloneContentPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneCommunitiesCommunityIdPosts(props: {
  communityId: string;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with community filter and soft-delete exclusion
  const where: Prisma.reddit_clone_content_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  // Build order by based on requested sort algorithm
  let orderBy: Prisma.reddit_clone_content_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  switch (props.body.sort) {
    case "hot":
      orderBy = {
        vote_score: "desc",
        created_at: "desc",
      };
      break;
    case "new":
      orderBy = {
        created_at: "desc",
      };
      break;
    case "top":
      orderBy = {
        vote_score: "desc",
      };
      break;
    case "controversial":
      // Controversial: posts with many votes but score close to zero
      orderBy = {
        vote_score: "desc", // Higher absolute scores first
        created_at: "desc", // Then recent first
      };
      break;
  }
  // Apply time filter for top sorting
  if (props.body.sort === "top" && props.body.timeFilter) {
    let startTimeFilter: string & tags.Format<"date-time">;
    switch (props.body.timeFilter) {
      case "today":
        startTimeFilter = new Date(
          new Date().setHours(0, 0, 0, 0),
        ).toISOString() as string & tags.Format<"date-time">;
        break;
      case "week":
        startTimeFilter = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString() as string & tags.Format<"date-time">;
        break;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startTimeFilter = monthAgo.toISOString() as string &
          tags.Format<"date-time">;
        break;
      case "year":
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startTimeFilter = yearAgo.toISOString() as string &
          tags.Format<"date-time">;
        break;
      case "allTime":
      default:
        startTimeFilter = "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">;
        break;
    }
    where.created_at = {
      gte: startTimeFilter,
    };
  }
  // Query posts with sorting and pagination
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditCloneContentPostAtSummaryTransformer.select(),
  });
  // Query total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where,
  });
  // Transform posts and build response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneContentPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
