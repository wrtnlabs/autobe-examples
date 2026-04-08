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
  const page = props.body.page ?? 1;
  const pageSize =
    (props.body.limit ?? 20) > 100 ? 100 : (props.body.limit ?? 20);
  const skip = (page - 1) * pageSize;
  const where: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.communityId) {
    where.reddit_clone_community_id = props.body.communityId;
  }
  if (props.body.type) {
    where.type = props.body.type;
  }
  if (props.body.subscribedOnly) {
    where.reddit_clone_community_id = {
      in: [],
    };
  }
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.timeRange ?? "all";
  if ((sort === "top" || sort === "controversial") && timeRange !== "all") {
    const now = new Date();
    const nowTs = now.getTime();
    let offsetMs: number;
    if (timeRange === "day") {
      offsetMs = 24 * 60 * 60 * 1000;
    } else if (timeRange === "week") {
      offsetMs = 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === "month") {
      offsetMs = 30 * 24 * 60 * 60 * 1000;
    } else {
      offsetMs = 365 * 24 * 60 * 60 * 1000;
    }
    const startTs = nowTs - offsetMs;
    const startDate = new Date(startTs);
    where.created_at = {
      gte: startDate,
    };
  }
  const countWhere: Prisma.reddit_clone_postsWhereInput = { ...where };
  if (props.body.cursor) {
    const decoded = Buffer.from(props.body.cursor, "base64").toString("utf-8");
    const cursor = JSON.parse(decoded) as {
      createdAt: string;
      id: string;
    };
    const cursorDate = new Date(cursor.createdAt);
    where.AND = [
      {
        OR: [
          {
            created_at: {
              lt: cursorDate,
            },
          },
          {
            created_at: cursorDate,
            id: {
              lt: cursor.id,
            },
          },
        ],
      },
    ];
  }
  let orderBy: Prisma.reddit_clone_postsOrderByWithRelationInput;
  if (sort === "hot") {
    orderBy = { vote_score: "desc", created_at: "desc", id: "desc" };
  } else if (sort === "new") {
    orderBy = { created_at: "desc", id: "desc" };
  } else if (sort === "top") {
    orderBy = { vote_score: "desc", created_at: "desc", id: "desc" };
  } else {
    orderBy = { vote_score: "asc", created_at: "desc", id: "desc" };
  }
  const records = await MyGlobal.prisma.reddit_clone_posts.findMany({
    skip,
    take: pageSize,
    where,
    orderBy,
    ...RedditClonePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: countWhere,
  });
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
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