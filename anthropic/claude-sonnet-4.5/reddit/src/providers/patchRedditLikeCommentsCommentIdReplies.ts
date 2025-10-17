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

export async function patchRedditLikeCommentsCommentIdReplies(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IReplyRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const { commentId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const sortBy = body.sort_by ?? "created_at";

  const skip = (page - 1) * limit;

  const parentComment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: commentId },
  });

  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }

  const orderBy =
    sortBy === "vote_score"
      ? { vote_score: "desc" as const }
      : sortBy === "created_at"
        ? { created_at: "desc" as const }
        : { created_at: "desc" as const };

  const [replies, totalCount] = await Promise.all([
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        reddit_like_parent_comment_id: commentId,
        deleted_at: null,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_comments.count({
      where: {
        reddit_like_parent_comment_id: commentId,
        deleted_at: null,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const data = replies.map((reply) => {
    const contentPreview =
      reply.content_text.length > 500
        ? reply.content_text.substring(0, 500)
        : reply.content_text;

    return {
      id: reply.id as string & tags.Format<"uuid">,
      content_text: contentPreview as string & tags.MaxLength<500>,
      vote_score: reply.vote_score as number & tags.Type<"int32">,
      created_at: toISOStringSafe(reply.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
