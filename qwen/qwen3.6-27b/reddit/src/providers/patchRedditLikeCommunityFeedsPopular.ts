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

export async function patchRedditLikeCommunityFeedsPopular(props: {
  body: IREdditLikeCommunityPost.IRequest;
}): Promise<IPageIRedditLikeCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const sortStrategy = props.body.sort_by ?? "hot";
  const isDbSortable = sortStrategy === "new";
  const whereInput = {
    deleted_at: null,
    ...(props.body.author_id !== undefined && {
      author_id: props.body.author_id,
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.post_type !== undefined && {
      post_type: props.body.post_type,
    }),
    ...(props.body.search !== undefined && {
      title: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.time_filter !== undefined &&
      props.body.time_filter !== "all_time" && {
        created_at: { gte: getTimeRangeStart(props.body.time_filter) },
      }),
  } satisfies Prisma.reddit_like_community_postsWhereInput;
  const total = await MyGlobal.prisma.reddit_like_community_posts.count({
    where: whereInput,
  });
  if (isDbSortable) {
    const posts = await MyGlobal.prisma.reddit_like_community_posts.findMany({
      where: whereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      ...REdditLikeCommunityPostAtSummaryTransformer.select(),
    });
    return {
      data: await ArrayUtil.asyncMap(
        posts,
        REdditLikeCommunityPostAtSummaryTransformer.transform,
      ),
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
    };
  }
  const fetchTake = Math.min(5000, Math.max(total, (page - 1) * limit + limit));
  const posts = await MyGlobal.prisma.reddit_like_community_posts.findMany({
    where: whereInput,
    take: fetchTake,
    ...REdditLikeCommunityPostAtSummaryTransformer.select(),
  });
  const sorted = applicationSortPosts(posts, sortStrategy);
  const pageSlice = sorted.slice((page - 1) * limit, page * limit);
  return {
    data: await ArrayUtil.asyncMap(
      pageSlice,
      REdditLikeCommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function getTimeRangeStart(timeFilter: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  switch (timeFilter) {
    case "today": {
      const d = new Date(year, month, day);
      return d.toISOString();
    }
    case "this_week": {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - offset);
      return startOfWeek.toISOString();
    }
    case "this_month": {
      const d = new Date(year, month, 1);
      return d.toISOString();
    }
    case "this_year": {
      const d = new Date(year, 0, 1);
      return d.toISOString();
    }
    default:
      return new Date(year, month, day).toISOString();
  }
}
function applicationSortPosts(
  posts: REdditLikeCommunityPostAtSummaryTransformer.Payload[],
  strategy: string,
): REdditLikeCommunityPostAtSummaryTransformer.Payload[] {
  const now = Date.now();
  return [...posts].sort((a, b) => {
    const ma = postMetrics(a, now);
    const mb = postMetrics(b, now);
    switch (strategy) {
      case "hot": {
        const gravity = 1.8;
        const hotA =
          (ma.upvotes * Math.sign(ma.score)) /
          Math.pow(Math.max(ma.ageHours, 0) + 2, gravity);
        const hotB =
          (mb.upvotes * Math.sign(mb.score)) /
          Math.pow(Math.max(mb.ageHours, 0) + 2, gravity);
        return hotB - hotA;
      }
      case "top":
        return mb.score - ma.score;
      case "controversial": {
        const cA = ma.totalVotes / (Math.abs(ma.score) + 1);
        const cB = mb.totalVotes / (Math.abs(mb.score) + 1);
        return cB - cA;
      }
      default:
        return mb.score - ma.score;
    }
  });
}
function postMetrics(
  post: REdditLikeCommunityPostAtSummaryTransformer.Payload,
  now: number,
): {
  score: number;
  upvotes: number;
  totalVotes: number;
  ageHours: number;
} {
  const votes = post.postVotes;
  const upvotes = votes.filter((v) => v.direction === "up").length;
  const downvotes = votes.filter((v) => v.direction === "down").length;
  const score = upvotes - downvotes;
  const totalVotes = upvotes + downvotes;
  const ageHours = (now - post.created_at.getTime()) / 3600000;
  return { score, upvotes, totalVotes, ageHours };
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
// export async function patchRedditLikeCommunityFeedsPopular(props: {
//   body: IREdditLikeCommunityPost.IRequest;
// }): Promise<IPageIRedditLikeCommunityPost.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityPostAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------