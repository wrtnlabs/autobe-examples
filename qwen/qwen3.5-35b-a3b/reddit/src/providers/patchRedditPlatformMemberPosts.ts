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

export async function patchRedditPlatformMemberPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be 1 or greater", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const validSortValues = ["hot", "new", "top", "controversial"];
  const sort = props.body.sort ?? "new";
  if (!validSortValues.some((v) => v === sort)) {
    throw new HttpException("Invalid sort value", 400);
  }
  if (
    sort === "top" &&
    props.body.topTimeRange &&
    !["today", "week", "month", "year", "all"].includes(props.body.topTimeRange)
  ) {
    throw new HttpException("Invalid topTimeRange value", 400);
  }
  const whereClause: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id
      ? {
          community: { id: props.body.community_id },
        }
      : {}),
    ...(props.body.author_id
      ? {
          author: { id: props.body.author_id },
        }
      : {}),
    ...(props.body.post_type
      ? {
          post_type: props.body.post_type,
        }
      : {}),
    ...(props.body.title_search
      ? {
          title: {
            contains: props.body.title_search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.startDate
      ? {
          created_at: {
            gte: new Date(props.body.startDate),
          },
        }
      : {}),
    ...(props.body.endDate
      ? {
          created_at: {
            lte: new Date(props.body.endDate),
          },
        }
      : {}),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  if (sort === "top" && props.body.topTimeRange) {
    const now = new Date();
    const startDate: Date | undefined = (() => {
      switch (props.body.topTimeRange) {
        case "today":
          return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case "week":
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "month":
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case "year":
          return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        case "all":
        default:
          return undefined;
      }
    })();
    if (startDate) {
      whereClause.created_at = {
        gte: startDate,
      };
    }
  }
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    (() => {
      switch (sort) {
        case "hot":
          return [{ created_at: "desc" }, { upvotes_count: "desc" }];
        case "new":
          return [{ created_at: "desc" }];
        case "top":
          return [{ upvotes_count: "desc" }];
        case "controversial":
          return [{ upvotes_count: "desc" }];
        default:
          return [{ created_at: "desc" }];
      }
    })();
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
    ...RedditPlatformPostAtSummaryTransformer.select(),
    where: whereClause,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereClause,
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
// export async function patchRedditPlatformMemberPosts(props: {
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