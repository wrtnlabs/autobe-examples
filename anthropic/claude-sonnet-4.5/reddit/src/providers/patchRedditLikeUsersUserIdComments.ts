import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";

export async function patchRedditLikeUsersUserIdComments(props: {
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.ICommentsRequest;
}): Promise<IPageIRedditLikeComment.ISummary> {
  const { userId, body } = props;

  // Extract and apply defaults for pagination and sorting
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const sortBy = body.sort_by ?? "new";

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Determine orderBy based on sort_by parameter
  const orderBy =
    sortBy === "top"
      ? { vote_score: "desc" as const, created_at: "desc" as const }
      : sortBy === "controversial"
        ? { vote_score: "asc" as const, created_at: "desc" as const }
        : { created_at: "desc" as const };

  // Execute parallel queries for comments and total count
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_comments.findMany({
      where: {
        reddit_like_member_id: userId,
        deleted_at: null,
      },
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        content_text: true,
        vote_score: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_like_comments.count({
      where: {
        reddit_like_member_id: userId,
        deleted_at: null,
      },
    }),
  ]);

  // Transform comments to ISummary format with content preview truncation
  const data = comments.map((comment) => {
    const contentPreview =
      comment.content_text.length > 500
        ? comment.content_text.substring(0, 500)
        : comment.content_text;

    return {
      id: comment.id as string & tags.Format<"uuid">,
      content_text: contentPreview as string & tags.MaxLength<500>,
      vote_score: comment.vote_score,
      created_at: toISOStringSafe(comment.created_at),
    };
  });

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  // Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
