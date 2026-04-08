import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberTrendingPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.limit ?? 20;
  const sort: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "new";
  const topTimeRange: "today" | "week" | "month" | "year" | "all" =
    props.body.topTimeRange ?? "all";
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (sort === "top" && topTimeRange !== "all") {
    const nowTimestamp: number = Date.now();
    const intervalMap: Record<string, number> = {
      today: 24,
      week: 7,
      month: 30,
      year: 365,
    };
    const hoursToSubtract: number = intervalMap[topTimeRange] * 24;
    const fromTimestamp: number =
      nowTimestamp - hoursToSubtract * 60 * 60 * 1000;
    whereInput.created_at = {
      gte: new Date(fromTimestamp),
    };
  }
  if (props.body.community_id) {
    whereInput.community_id = props.body.community_id;
  }
  if (props.body.author_id) {
    whereInput.author_id = props.body.author_id;
  }
  if (props.body.post_type) {
    whereInput.post_type = props.body.post_type;
  }
  if (props.body.title_search) {
    whereInput.title = {
      contains: props.body.title_search,
    };
  }
  if (props.body.startDate) {
    const startDateTimestamp: number = Date.parse(props.body.startDate);
    if (!Number.isNaN(startDateTimestamp)) {
      if (
        whereInput.created_at &&
        typeof whereInput.created_at === "object" &&
        "gte" in whereInput.created_at
      ) {
        whereInput.created_at = {
          gte: whereInput.created_at.gte,
          lte: new Date(startDateTimestamp),
        };
      } else {
        whereInput.created_at = { gte: new Date(startDateTimestamp) };
      }
    }
  }
  if (props.body.endDate) {
    const endDateTimestamp: number = Date.parse(props.body.endDate);
    if (!Number.isNaN(endDateTimestamp)) {
      if (
        whereInput.created_at &&
        typeof whereInput.created_at === "object" &&
        "gte" in whereInput.created_at
      ) {
        whereInput.created_at = {
          gte: whereInput.created_at.gte,
          lte: new Date(endDateTimestamp),
        };
      } else {
        whereInput.created_at = { lte: new Date(endDateTimestamp) };
      }
    }
  }
  const orderByInput:
    | Prisma.reddit_platform_postsOrderByWithRelationInput
    | Array<Prisma.reddit_platform_postsOrderByWithRelationInput> = (() => {
    switch (sort) {
      case "hot":
        return {
          upvotes_count: "desc",
          created_at: "desc",
        };
      case "new":
        return { created_at: "desc" };
      case "top":
        return {
          upvotes_count: "desc",
          downvotes_count: "asc",
        };
      case "controversial":
        return {
          downvotes_count: "desc",
          upvotes_count: "asc",
        };
      default:
        return { created_at: "desc" };
    }
  })();
  const [records, total]: [
    Array<
      Prisma.reddit_platform_postsGetPayload<
        ReturnType<typeof RedditPlatformPostAtSummaryTransformer.select>
      >
    >,
    number,
  ] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberTrendingPosts(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPost.IRequest;
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