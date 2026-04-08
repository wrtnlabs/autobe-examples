import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_post_id: props.postId,
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      author: { id: props.body.member_id },
    }),
    ...(props.body.parent_id !== undefined && {
      reddit_community_comment_id: props.body.parent_id,
    }),
  };
  const orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    (() => {
      if (props.body.sort_by === "vote_count") {
        return [{ votes: { _count: "desc" } }];
      }
      if (props.body.sort_by === "updated_at") {
        return [{ updated_at: props.body.sort_order ?? ("desc" as const) }];
      }
      return [{ created_at: props.body.sort_order ?? ("desc" as const) }];
    })();
  const records = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit + 1,
    include: {
      author: true,
      votes: true,
      replies: true,
    },
  });
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, -1) : records;
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (record) => ({
      id: record.id,
      content: record.content,
      author: {
        id: record.author.id,
        username: record.author.username,
        created_at: record.author.created_at.toISOString(),
        updated_at: record.author.updated_at.toISOString(),
      } satisfies IRedditCommunityMember.ISummary,
      vote_count: record.votes.length,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at: record.deleted_at?.toISOString() ?? null,
      is_top_level: record.reddit_community_comment_id === null,
      reply_count: record.replies.length,
    })),
  } satisfies IPageIRedditCommunityComment.ISummary;
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
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityPostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityComment.IRequest;
// }): Promise<IPageIRedditCommunityComment.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_comments.findMany({
//     ...RedditCommunityCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityCommentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------