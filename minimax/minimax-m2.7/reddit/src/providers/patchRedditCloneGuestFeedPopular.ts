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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestFeedPopular(props: {
  guest: GuestPayload;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = (props.body.limit ?? 25) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.timeRange ?? "all";
  // Time threshold for top/controversial sorting
  const getTimeThreshold = (): Date | undefined => {
    if (sort !== "top" && sort !== "controversial") {
      return undefined;
    }
    const now = new Date();
    switch (timeRange) {
      case "day":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case "year":
        return new Date(now.getFullYear(), 0, 1);
      case "all":
      default:
        return undefined;
    }
  };
  const timeThreshold = getTimeThreshold();
  // Build where clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.type !== undefined && { type: props.body.type }),
    ...(props.body.communityId !== undefined && {
      reddit_clone_community_id: props.body.communityId,
    }),
    ...(timeThreshold !== undefined && {
      created_at: { gte: timeThreshold },
    }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  // Build order by clause
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" as const }]
      : sort === "top"
        ? [{ vote_score: "desc" as const }]
        : sort === "controversial"
          ? [{ vote_score: "asc" as const }]
          : [{ vote_score: "desc" as const }, { created_at: "desc" as const }];
  // Get select from transformer
  const postSelect = RedditClonePostAtSummaryTransformer.select();
  // Execute query
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: postSelect.select,
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditClonePostAtSummaryTransformer.transform,
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
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneGuestFeedPopular(props: {
//   guest: GuestPayload;
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