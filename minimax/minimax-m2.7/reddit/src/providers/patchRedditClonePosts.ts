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
import { RedditClonePostAtSummaryTransformer } from "../transformers/RedditClonePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePosts(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const body = props.body;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const limit = Math.min(body.limit ?? 20, 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    ...(body.communityId !== undefined
      ? { reddit_clone_community_id: body.communityId }
      : {}),
    ...(body.type !== undefined
      ? { type: body.type as "text" | "link" | "image" }
      : {}),
  };
  const now = new Date();
  interface TimeRangeParams {
    gte?: Date;
    lt?: Date;
  }
  const timeFilter: TimeRangeParams = {};
  if (body.sort === "top" || body.sort === "controversial") {
    const range = body.timeRange ?? "all";
    const msPerDay = 24 * 60 * 60 * 1000;
    switch (range) {
      case "day":
        timeFilter.gte = new Date(now.getTime() - msPerDay);
        break;
      case "week":
        timeFilter.gte = new Date(now.getTime() - 7 * msPerDay);
        break;
      case "month":
        timeFilter.gte = new Date(now.getTime() - 30 * msPerDay);
        break;
      case "year":
        timeFilter.gte = new Date(now.getTime() - 365 * msPerDay);
        break;
      case "all":
      default:
        break;
    }
  }
  if (Object.keys(timeFilter).length > 0) {
    baseWhere.created_at = timeFilter;
  }
  const sort = body.sort ?? "hot";
  let orderBy: Prisma.reddit_clone_postsOrderByWithRelationInput;
  switch (sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_score: "desc" };
      break;
    case "controversial":
      orderBy = { vote_score: "asc" };
      break;
    case "hot":
    default:
      orderBy = { vote_score: "desc" };
      break;
  }
  const cursor = body.cursor;
  let take = limit as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  if (cursor !== undefined) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const pipeIndex = decoded.indexOf("|");
      if (pipeIndex > 0) {
        const cursorCreatedAt = decoded.substring(0, pipeIndex);
        const cursorId = decoded.substring(pipeIndex + 1);
        const cursorDate = new Date(cursorCreatedAt);
        take = (limit + 1) as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>;
        (baseWhere as Record<string, unknown>).AND = [
          {
            OR: [
              { created_at: { lt: cursorDate } },
              {
                AND: [{ created_at: cursorDate }, { id: { lt: cursorId } }],
              },
            ],
          },
        ];
      }
    } catch {
      // Invalid cursor, ignore and use offset pagination
    }
  }
  // Use include only - cannot mix include and select at same level
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: baseWhere,
    orderBy: [
      orderBy,
      { created_at: "desc" as const },
      { id: "desc" as const },
    ],
    take: take,
    skip: cursor !== undefined ? undefined : skip,
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      community: {
        include: {
          member: {
            select: {
              id: true,
              username: true,
            },
          },
          icon: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          subscriber_count: true,
        },
      },
      postTextContent: {
        select: {
          body: true,
        },
      },
      link: {
        select: {
          url: true,
        },
      },
      image: {
        select: {
          reddit_clone_file_id: true,
        },
      },
      comments: true,
      postVotes: true,
    },
  });
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const countWhere: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    ...(body.communityId !== undefined
      ? { reddit_clone_community_id: body.communityId }
      : {}),
    ...(body.type !== undefined
      ? { type: body.type as "text" | "link" | "image" }
      : {}),
    ...(Object.keys(timeFilter).length > 0
      ? {
          created_at: timeFilter,
        }
      : {}),
  };
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: countWhere,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data as Parameters<
      typeof RedditClonePostAtSummaryTransformer.transform
    >[0][],
    RedditClonePostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: transformedData,
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
// export async function patchRedditClonePosts(props: {
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