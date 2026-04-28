import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityPostAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommunitiesCommunityIdFeeds(props: {
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityPost.IRequest;
}): Promise<IPageIRedditLikeCommunityPost.ISummary> {
  // 1. Validate community exists and is not soft-deleted
  await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // 2. Parse and validate query parameters
  const sortBy = props.body.sort_by ?? "new";
  const timeFilter = props.body.time_filter ?? "all_time";
  const validSortByOptions = ["hot", "new", "top", "controversial"];
  if (!validSortByOptions.includes(sortBy)) {
    throw new HttpException("Invalid sort_by value", 400);
  }
  const validTimeFilterOptions = [
    "today",
    "this_week",
    "this_month",
    "all_time",
  ];
  if (!validTimeFilterOptions.includes(timeFilter)) {
    throw new HttpException("Invalid time_filter value", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  // 3. Compute time filter boundary
  const now = new Date();
  const timeWhere: Prisma.reddit_like_community_postsWhereInput =
    timeFilter === "today"
      ? { created_at: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) } }
      : timeFilter === "this_week"
        ? (() => {
            const dayOfWeek = now.getUTCDay();
            const startOfWeek = new Date(now);
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startOfWeek.setUTCDate(now.getUTCDate() + diff);
            startOfWeek.setUTCHours(0, 0, 0, 0);
            return { created_at: { gte: startOfWeek } };
          })()
        : timeFilter === "this_month"
          ? {
              created_at: {
                gte: new Date(
                  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
                ),
              },
            }
          : {};
  // 4. Build complete where clause
  const whereInput: Prisma.reddit_like_community_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(Object.keys(timeWhere).length > 0 ? timeWhere : {}),
    ...(props.body.search && { title: { contains: props.body.search } }),
    ...(props.body.post_type && { post_type: props.body.post_type }),
    ...(props.body.author_id && { author_id: props.body.author_id }),
    community: { deleted_at: null },
  };
  // 5. Count total matching records
  const totalRecords = await MyGlobal.prisma.reddit_like_community_posts.count({
    where: whereInput,
  });
  // 6. Fetch posts with transformer select for aggregation relations
  const fetchLimit = page * limit;
  const posts = await MyGlobal.prisma.reddit_like_community_posts.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    take: fetchLimit,
    ...REdditLikeCommunityPostAtSummaryTransformer.select(),
  });
  // 7. Compute engagement scores
  const scored = posts.map((record) => {
    const upVotes = record.postVotes.filter((v) => v.direction === "up").length;
    const downVotes = record.postVotes.filter(
      (v) => v.direction === "down",
    ).length;
    const activeComments = record.comments.filter(
      (c) => c.deleted_at === null,
    ).length;
    return {
      record,
      voteScore: upVotes - downVotes,
      commentCount: activeComments,
      engagement: upVotes - downVotes + activeComments,
      controversy: Math.abs(upVotes - downVotes),
    };
  });
  // 8. Sort by selected criterion
  scored.sort((a, b) => {
    if (sortBy === "hot") return b.engagement - a.engagement;
    if (sortBy === "new")
      return b.record.created_at.getTime() - a.record.created_at.getTime();
    if (sortBy === "top") return b.voteScore - a.voteScore;
    if (sortBy === "controversial") return b.controversy - a.controversy;
    return 0;
  });
  // 9. Slice for current page
  const skip = (page - 1) * limit;
  const pageData = scored.slice(skip, skip + limit).map((s) => s.record);
  // 10. Build paginated result
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      pageData,
      REdditLikeCommunityPostAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommunitiesCommunityIdFeeds(props: {
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityPost.IRequest;
// }): Promise<IPageIRedditLikeCommunityPost.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityPostAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------