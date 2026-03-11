import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = (page - 1) * limit;
  const whereInput = {
    post_id: props.postId,
    deleted_at: null,
  } satisfies Prisma.reddit_like_commentsWhereInput;
  const orderByInput =
    props.body.sort === "new"
      ? [
          {
            created_at: "desc",
          } satisfies Prisma.reddit_like_commentsOrderByWithRelationInput,
        ]
      : props.body.sort === "controversial"
        ? [
            {
              vote_score: "desc",
            } satisfies Prisma.reddit_like_commentsOrderByWithRelationInput,
            {
              created_at: "asc",
            } satisfies Prisma.reddit_like_commentsOrderByWithRelationInput,
          ]
        : [
            {
              vote_score: "desc",
            } satisfies Prisma.reddit_like_commentsOrderByWithRelationInput,
            {
              created_at: "desc",
            } satisfies Prisma.reddit_like_commentsOrderByWithRelationInput,
          ];
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: whereInput,
      skip: offset,
      take: limit,
      orderBy: orderByInput,
      ...RedditLikeCommentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_comments.count({ where: whereInput }),
  ]);
  const data = await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditLikeComment.ISummary;
}
