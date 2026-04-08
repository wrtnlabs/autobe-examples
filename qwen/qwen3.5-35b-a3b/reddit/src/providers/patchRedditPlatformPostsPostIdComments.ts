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
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.IRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const validatedLimit: number = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const validatedPage: number = page < 1 ? 1 : page;
  const skip: number = (validatedPage - 1) * validatedLimit;
  const sortBy: "new" | "top" | "best" | "controversial" =
    props.body.sortBy ?? "new";
  const orderDirection: "asc" | "desc" =
    props.body.order ?? (sortBy === "new" ? "asc" : "desc");
  const orderByClause: Prisma.reddit_platform_commentsOrderByWithRelationInput[] =
    sortBy === "new"
      ? [{ created_at: orderDirection }]
      : sortBy === "top"
        ? [{ score: orderDirection }]
        : sortBy === "best"
          ? [{ score: orderDirection }, { created_at: orderDirection }]
          : [{ score: orderDirection }];
  const postExists: boolean = await MyGlobal.prisma.reddit_platform_posts
    .findUnique({
      where: { id: props.postId },
      select: { id: true },
    })
    .then((p) => p !== null);
  if (!postExists) {
    throw new HttpException("Post not found", 404);
  }
  const whereCondition: Prisma.reddit_platform_commentsWhereInput = {
    reddit_platform_post_id: props.postId,
    deleted_at: null,
    ...(props.body.created_at_start !== undefined && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.author_id !== undefined && {
      reddit_platform_member_id: props.body.author_id,
    }),
  };
  const data: Prisma.reddit_platform_commentsGetPayload<
    ReturnType<typeof RedditPlatformCommentAtSummaryTransformer.select>
  >[] = await MyGlobal.prisma.reddit_platform_comments.findMany({
    where: whereCondition,
    orderBy: orderByClause,
    skip: skip,
    take: validatedLimit,
    ...RedditPlatformCommentAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.reddit_platform_comments.count({
    where: whereCondition,
  });
  return {
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
    data: await RedditPlatformCommentAtSummaryTransformer.transformAll(data),
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
// export async function patchRedditPlatformPostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditPlatformComment.IRequest;
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