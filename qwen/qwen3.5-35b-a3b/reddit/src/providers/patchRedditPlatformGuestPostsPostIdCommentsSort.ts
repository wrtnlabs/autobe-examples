import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestPostsPostIdCommentsSort(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.ISortRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const sort: "best" | "new" | "controversial" =
    props.body.sort === "best" ||
    props.body.sort === "new" ||
    props.body.sort === "controversial"
      ? props.body.sort
      : "best";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  let records: IRedditPlatformComment.ISummary[] = [];
  if (sort === "controversial") {
    const rawRecords = await MyGlobal.prisma.reddit_platform_comments.findMany({
      ...RedditPlatformCommentAtSummaryTransformer.select(),
      where: {
        reddit_platform_post_id: props.postId,
        deleted_at: null,
        AND: [{ upvotes_count: { gte: 0 } }, { downvotes_count: { gte: 0 } }],
      },
      skip,
      take: limit,
    });
    const filteredAndSorted = rawRecords
      .filter((record) => record.upvotes_count + record.downvotes_count >= 5)
      .sort((a, b) => {
        const absScoreA = Math.abs(a.score);
        const absScoreB = Math.abs(b.score);
        if (absScoreA !== absScoreB) {
          return absScoreA - absScoreB;
        }
        const totalVotesA = a.upvotes_count + a.downvotes_count;
        const totalVotesB = b.upvotes_count + b.downvotes_count;
        return totalVotesB - totalVotesA;
      });
    records =
      await RedditPlatformCommentAtSummaryTransformer.transformAll(
        filteredAndSorted,
      );
  } else {
    const orderByInput: Prisma.reddit_platform_commentsOrderByWithRelationInput[] =
      sort === "best"
        ? [{ score: "desc" as const }, { created_at: "asc" as const }]
        : [{ created_at: "desc" as const }];
    const rawRecords = await MyGlobal.prisma.reddit_platform_comments.findMany({
      ...RedditPlatformCommentAtSummaryTransformer.select(),
      where: {
        reddit_platform_post_id: props.postId,
        deleted_at: null,
      },
      orderBy: orderByInput,
      skip,
      take: limit,
    });
    records =
      await RedditPlatformCommentAtSummaryTransformer.transformAll(rawRecords);
  }
  const total = await MyGlobal.prisma.reddit_platform_comments.count({
    where: {
      reddit_platform_post_id: props.postId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records,
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformGuestPostsPostIdCommentsSort(props: {
//   guest: GuestPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditPlatformComment.ISortRequest;
// }): Promise<IPageIRedditPlatformComment.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_comments.findMany({
//     ...RedditPlatformCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await RedditPlatformCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------