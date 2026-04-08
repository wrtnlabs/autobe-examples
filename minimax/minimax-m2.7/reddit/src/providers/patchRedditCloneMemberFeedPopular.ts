import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberFeedPopular(props: {
  member: MemberPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  // Extract and normalize request parameters with defaults
  const sort = props.body.sort ?? "hot";
  const limit = Math.min(props.body.limit ?? 25, 100);
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const timeRange = props.body.timeRange ?? "all";
  // Calculate time boundary for top/controversial sorting
  const now = new Date();
  let createdAfter: Date | undefined = undefined;
  if (sort === "top" || sort === "controversial") {
    switch (timeRange) {
      case "day":
        createdAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        createdAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        createdAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        createdAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        // No time filter
        break;
    }
  }
  // Build where clause: exclude soft-deleted posts
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    ...(createdAfter !== undefined && { created_at: { gte: createdAfter } }),
  };
  // Build orderBy based on sort type
  let orderBy:
    | Prisma.reddit_clone_postsOrderByWithRelationInput
    | Prisma.reddit_clone_postsOrderByWithRelationInput[];
  switch (sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      // Controversial: posts with balanced upvotes/downvotes (vote_score near zero)
      orderBy = { vote_score: "asc" };
      break;
    case "hot":
    default:
      // Hot: combination of vote_score and recency using compound ordering
      orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
      break;
  }
  // Execute findMany query
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    orderBy: orderBy,
    take: limit,
    skip: skip,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  // Transform records to response DTOs
  const data = await ArrayUtil.asyncMap(
    records,
    RedditClonePostAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
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
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberFeedPopular(props: {
//   member: MemberPayload;
//   body: IRedditClonePost.IRequest;
// }): Promise<IPageIRedditClonePost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
//     ...RedditClonePostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditClonePostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------