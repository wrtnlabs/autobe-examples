import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommentAtSummaryTransformer } from "../transformers/RedditLikeCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy =
    props.body.sort === "new"
      ? { created_at: "desc" as const }
      : props.body.sort === "controversial"
        ? [{ vote_score: "asc" as const }, { created_at: "desc" as const }]
        : [{ vote_score: "desc" as const }, { created_at: "desc" as const }];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy,
      ...RedditLikeCommentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_comments.count({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeCommentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
