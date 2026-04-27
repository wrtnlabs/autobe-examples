import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  // 1. Verify the post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // 2. Parse request parameters with defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const sort: string = props.body.sort ?? "best";
  // 3. Build WHERE clause
  const where: Prisma.community_platform_commentsWhereInput = {
    community_platform_post_id: props.postId,
  };
  if (props.body.parentCommentId !== undefined) {
    where.community_platform_comment_id = props.body.parentCommentId;
  } else {
    where.community_platform_comment_id = null;
  }
  // 4. Fetch all matching comments (including deleted — we filter in app)
  const records = await MyGlobal.prisma.community_platform_comments.findMany({
    where,
    ...CommunityPlatformCommentAtSummaryTransformer.select(),
  });
  // 5. Transform all records
  let comments =
    await CommunityPlatformCommentAtSummaryTransformer.transformAll(records);
  // 6. Post-filter: remove deleted comments without children; set placeholder for deleted with children
  comments = comments.filter(
    (c: ICommunityPlatformComment.ISummary) =>
      c.deleted_at === null || c.reply_count > 0,
  );
  comments = comments.map((c: ICommunityPlatformComment.ISummary) => {
    if (c.deleted_at !== null && c.reply_count > 0) {
      return { ...c, content: "[deleted]" };
    }
    return c;
  });
  // 7. Sort in application code
  if (sort === "best") {
    comments.sort(
      (
        a: ICommunityPlatformComment.ISummary,
        b: ICommunityPlatformComment.ISummary,
      ) => {
        if (b.vote_score !== a.vote_score) {
          return b.vote_score - a.vote_score;
        }
        return b.created_at.localeCompare(a.created_at);
      },
    );
  } else if (sort === "new") {
    comments.sort(
      (
        a: ICommunityPlatformComment.ISummary,
        b: ICommunityPlatformComment.ISummary,
      ) => {
        return b.created_at.localeCompare(a.created_at);
      },
    );
  } else if (sort === "controversial") {
    // For controversial, we need total vote counts. Fetch vote_summaries for these comments.
    const commentIds: string[] = comments.map(
      (c: ICommunityPlatformComment.ISummary) => c.id,
    );
    const voteSummaries =
      await MyGlobal.prisma.community_platform_vote_summaries.findMany({
        where: {
          target_type: "comment",
          target_id: { in: commentIds },
        },
        select: {
          target_id: true,
          upvote_count: true,
          downvote_count: true,
          net_score: true,
        },
      });
    const voteMap: Map<
      string,
      {
        upvote_count: number;
        downvote_count: number;
        net_score: number;
      }
    > = new Map(voteSummaries.map((vs) => [vs.target_id, vs]));
    comments.sort(
      (
        a: ICommunityPlatformComment.ISummary,
        b: ICommunityPlatformComment.ISummary,
      ) => {
        const va = voteMap.get(a.id);
        const vb = voteMap.get(b.id);
        // Formula: ABS(net_score) + upvote_count + downvote_count
        const ca = va
          ? Math.abs(va.net_score) + va.upvote_count + va.downvote_count
          : 0;
        const cb = vb
          ? Math.abs(vb.net_score) + vb.upvote_count + vb.downvote_count
          : 0;
        if (cb !== ca) {
          return cb - ca;
        }
        return b.created_at.localeCompare(a.created_at);
      },
    );
  }
  // 8. Paginate
  const total: number = comments.length;
  const skip: number = (page - 1) * limit;
  const paginatedComments: ICommunityPlatformComment.ISummary[] =
    comments.slice(skip, skip + limit);
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  // 9. Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: paginatedComments,
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
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformPostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformComment.IRequest;
// }): Promise<IPageICommunityPlatformComment.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_comments.findMany({
//     ...CommunityPlatformCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await CommunityPlatformCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------