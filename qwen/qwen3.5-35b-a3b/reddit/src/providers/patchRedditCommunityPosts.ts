import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPosts(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const buildFilters = (): Prisma.reddit_community_postsWhereInput => {
    const filters: Prisma.reddit_community_postsWhereInput = {
      deleted_at: null,
    };
    if (props.body.postType !== undefined) {
      filters.post_type = props.body.postType;
    }
    if (
      props.body.voteScoreMin !== undefined ||
      props.body.voteScoreMax !== undefined
    ) {
      const voteScoreFilter: Prisma.IntFilter = {};
      if (props.body.voteScoreMin !== undefined) {
        voteScoreFilter.gte = props.body.voteScoreMin;
      }
      if (props.body.voteScoreMax !== undefined) {
        voteScoreFilter.lte = props.body.voteScoreMax;
      }
      filters.vote_score = voteScoreFilter;
    }
    if (props.body.dateFrom !== undefined || props.body.dateTo !== undefined) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (props.body.dateFrom !== undefined) {
        dateFilter.gte = props.body.dateFrom;
      }
      if (props.body.dateTo !== undefined) {
        dateFilter.lte = props.body.dateTo;
      }
      filters.created_at = dateFilter;
    }
    if (props.body.communityId !== undefined) {
      filters.reddit_community_community_id = props.body.communityId;
    }
    if (props.body.authorId !== undefined) {
      filters.reddit_community_member_id = props.body.authorId;
    }
    return filters;
  };
  const computeDateOffset = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return toISOStringSafe(d);
  };
  const applyTimePeriod = (
    filters: Prisma.reddit_community_postsWhereInput,
    timePeriod?: string,
  ): Prisma.reddit_community_postsWhereInput => {
    if (!timePeriod || timePeriod === "all_time") {
      return filters;
    }
    const offsetMap: Record<string, number> = {
      today: 1,
      this_week: 7,
      this_month: 30,
      this_year: 365,
      all_time: 0,
    };
    const offsetDays: number = offsetMap[timePeriod] ?? 0;
    if (offsetDays === 0) {
      return filters;
    }
    const minDate: string = computeDateOffset(offsetDays);
    const existingFilter: Prisma.DateTimeFilter | undefined =
      filters.created_at as Prisma.DateTimeFilter | undefined;
    if (existingFilter && typeof existingFilter === "object") {
      existingFilter.gte = minDate;
    } else {
      filters.created_at = { gte: minDate };
    }
    return filters;
  };
  const handleSort = (
    sortParam?: IRedditCommunityPost.IRequest["sort"],
  ): {
    filters: Prisma.reddit_community_postsWhereInput;
    orderBy: any;
  } => {
    let baseFilters = buildFilters();
    let orderBy: any;
    switch (sortParam) {
      case "top": {
        const timePeriod: string | undefined =
          props.body.timePeriod ?? "all_time";
        baseFilters = applyTimePeriod(baseFilters, timePeriod);
        orderBy = { vote_score: "desc" };
        break;
      }
      case "controversial": {
        orderBy = { vote_score: "asc" };
        break;
      }
      case "new":
      case "hot":
      default:
        orderBy = { created_at: "desc" };
        break;
    }
    return { filters: baseFilters, orderBy };
  };
  const { filters, orderBy } = handleSort(props.body.sort);
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: filters,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.reddit_community_posts.count({
    where: filters,
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
      RedditCommunityPostAtSummaryTransformer.transform,
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
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityPosts(props: {
//   body: IRedditCommunityPost.IRequest;
// }): Promise<IPageIRedditCommunityPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_posts.findMany({
//     ...RedditCommunityPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------