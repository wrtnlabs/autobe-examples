import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditLikePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IRequest;
}): Promise<IPageIRedditLikeComment> {
  const { postId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const sortBy = body.sort_by ?? "best";

  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: postId },
  });

  const [comments, totalCount] = await Promise.all([
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        reddit_like_post_id: postId,
        deleted_at: null,
      },
      orderBy:
        sortBy === "top"
          ? [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
          : sortBy === "new"
            ? { created_at: "desc" as const }
            : sortBy === "old"
              ? { created_at: "asc" as const }
              : sortBy === "controversial"
                ? [{ created_at: "desc" as const }]
                : [
                    { vote_score: "desc" as const },
                    { created_at: "desc" as const },
                  ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_comments.count({
      where: {
        reddit_like_post_id: postId,
        deleted_at: null,
      },
    }),
  ]);

  const data: IRedditLikeComment[] = comments.map((comment) => ({
    id: comment.id as string & tags.Format<"uuid">,
    reddit_like_post_id: comment.reddit_like_post_id as string &
      tags.Format<"uuid">,
    reddit_like_parent_comment_id:
      comment.reddit_like_parent_comment_id === null
        ? undefined
        : (comment.reddit_like_parent_comment_id as string &
            tags.Format<"uuid">),
    content_text: comment.content_text,
    depth: comment.depth,
    vote_score: comment.vote_score,
    edited: comment.edited,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
