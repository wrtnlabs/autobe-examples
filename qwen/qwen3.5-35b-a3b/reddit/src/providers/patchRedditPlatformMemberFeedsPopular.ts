import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberFeedsPopular(props: {
  member: MemberPayload;
  body: IRedditPlatformPopularFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safeLimit = limit > 100 ? 100 : limit;
  const safePage = page < 1 ? 1 : page;
  const offset = (safePage - 1) * safeLimit;
  const sort = props.body.sort ?? "hot";
  const topTimeRange = props.body.topTimeRange ?? "all";
  const now = new Date();
  const timeThreshold = (() => {
    switch (topTimeRange) {
      case "today":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  })();
  const baseWhere: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  };
  const where: Prisma.reddit_platform_postsWhereInput =
    timeThreshold !== null
      ? {
          ...baseWhere,
          created_at: {
            gte: timeThreshold,
          },
        }
      : baseWhere;
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput = (() => {
    switch (sort) {
      case "hot":
        return {
          upvotes_count: "desc",
        };
      case "new":
        return {
          created_at: "desc",
        };
      case "top":
        return {
          upvotes_count: "desc",
        };
      case "controversial":
        return {
          comment_count: "desc",
        };
      default:
        return {
          upvotes_count: "desc",
        };
    }
  })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where,
      skip: offset,
      take: safeLimit,
      ...RedditPlatformPostAtSummaryTransformer.select(),
      orderBy,
    }),
    MyGlobal.prisma.reddit_platform_posts.count({ where }),
  ]);
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
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
// import { IRedditPlatformPopularFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPopularFeedRequest";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberFeedsPopular(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPopularFeedRequest;
// }): Promise<IPageIRedditPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
//     ...RedditPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------