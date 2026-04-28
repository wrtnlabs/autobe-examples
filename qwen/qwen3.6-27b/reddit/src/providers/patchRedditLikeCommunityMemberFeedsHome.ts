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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityPostAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityMemberFeedsHome(props: {
  member: MemberPayload;
  body: IREdditLikeCommunityCommunity.IHomeFeedRequest;
}): Promise<IPageIRedditLikeCommunityPost.ISummary> {
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_community_subscriptions.findMany(
      {
        where: {
          member_id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
        select: {
          community_id: true,
        },
      },
    );
  const communityIds = subscriptions.map((s): string => s.community_id);
  const page: number = props.body.page ?? 1;
  const pageSize: number = props.body.pageSize ?? 20;
  if (communityIds.length === 0) {
    return {
      pagination: {
        current: page satisfies number as number,
        limit: pageSize satisfies number as number,
        records: 0 satisfies number as number,
        pages: 0 satisfies number as number,
      } as IPage.IPagination,
      data: [],
    };
  }
  const sortBy: string = props.body.sortBy ?? "hot";
  const timeFilter: string = props.body.timeFilter ?? "all_time";
  const currentTime = Date.now();
  const computeTimeFilterCutoff = (filter: string): number => {
    if (filter === "all_time") {
      return 0;
    }
    if (filter === "today") {
      return 0;
    }
    if (filter === "this_week") {
      return 0;
    }
    if (filter === "this_month") {
      return 0;
    }
    return 0;
  };
  const whereInput: Prisma.reddit_like_community_postsWhereInput = {
    community_id: { in: communityIds },
    deleted_at: null,
    community: {
      deleted_at: null,
    },
  };
  if (sortBy === "top" && timeFilter !== "all_time") {
    const cutoffTs = computeTimeFilterCutoff(timeFilter);
    whereInput.created_at = {
      gte: toISOStringSafe(new Date(cutoffTs)),
    } satisfies {
      gte: string;
    };
  }
  const posts = await MyGlobal.prisma.reddit_like_community_posts.findMany({
    where: whereInput,
    ...REdditLikeCommunityPostAtSummaryTransformer.select(),
  });
  type PostWithMeta = {
    post: (typeof posts)[number];
    voteScore: number;
    upVotes: number;
    downVotes: number;
    createdAtMs: number;
  };
  const postsWithMeta: PostWithMeta[] = posts.map((post) => {
    const upVotes = post.postVotes.filter((v) => v.direction === "UP").length;
    const downVotes = post.postVotes.filter(
      (v) => v.direction === "DOWN",
    ).length;
    return {
      post,
      voteScore: upVotes - downVotes,
      upVotes,
      downVotes,
      createdAtMs: new Date(post.created_at).getTime(),
    };
  });
  postsWithMeta.sort((a, b): number => {
    switch (sortBy) {
      case "hot": {
        const ageA: number = (currentTime - a.createdAtMs) / 3600000;
        const ageB: number = (currentTime - b.createdAtMs) / 3600000;
        const decay: number = 0.01;
        const hotA: number =
          a.voteScore *
          Math.exp(-decay * ageA) *
          (1 + Math.log2(1 + a.upVotes));
        const hotB: number =
          b.voteScore *
          Math.exp(-decay * ageB) *
          (1 + Math.log2(1 + b.upVotes));
        return hotB - hotA;
      }
      case "top": {
        return b.voteScore - a.voteScore;
      }
      case "controversial": {
        const ageA: number = (currentTime - a.createdAtMs) / 3600000;
        const ageB: number = (currentTime - b.createdAtMs) / 3600000;
        const decay: number = 0.02;
        const contA: number =
          ((a.upVotes * a.downVotes) / (Math.abs(a.voteScore) + 1)) *
          Math.exp(-decay * ageA);
        const contB: number =
          ((b.upVotes * b.downVotes) / (Math.abs(b.voteScore) + 1)) *
          Math.exp(-decay * ageB);
        return contB - contA;
      }
      default:
        return b.createdAtMs - a.createdAtMs;
    }
  });
  const totalRecords = postsWithMeta.length;
  const skip = (page - 1) * pageSize;
  const pagedPosts = postsWithMeta
    .slice(skip, skip + pageSize)
    .map((m): REdditLikeCommunityPostAtSummaryTransformer.Payload => m.post);
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: totalRecords,
      pages: Math.ceil(totalRecords / pageSize),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      pagedPosts,
      (p): Promise<IREdditLikeCommunityPost.ISummary> =>
        REdditLikeCommunityPostAtSummaryTransformer.transform(p),
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
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityMemberFeedsHome(props: {
//   member: MemberPayload;
//   body: IREdditLikeCommunityCommunity.IHomeFeedRequest;
// }): Promise<IPageIRedditLikeCommunityPost.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityPostAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------