import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminArticlesArticleIdComments(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleComment.IRequest;
}): Promise<IPageIDiscussionBoardArticleComment.ISummary> {
  const { page, limit, author_user_id, search, sort, include_deleted } =
    props.body;

  // Build where clause
  const where: Record<string, unknown> = {
    discussion_board_article_id: props.articleId,
    ...(typeof include_deleted === "boolean" &&
      include_deleted !== true && {
        deleted_at: null,
      }),
    ...(author_user_id !== undefined &&
      author_user_id !== null && {
        author_user_id,
      }),
    ...(search && { body: { contains: search } }),
  };
  // Sorting
  const orderBy = (() => {
    if (sort === "created_at-asc") return { created_at: "asc" as const };
    return { created_at: "desc" as const };
  })();
  // Pagination numbers
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  // Query total count
  const total = await MyGlobal.prisma.discussion_board_article_comments.count({
    where,
  });

  // Query page data
  const comments =
    await MyGlobal.prisma.discussion_board_article_comments.findMany({
      where,
      orderBy,
      skip,
      take: limitNumber,
    });
  // Fetch all unique author user ids for summary
  const authorIds = Array.from(new Set(comments.map((c) => c.author_user_id)));
  const users = await MyGlobal.prisma.discussion_board_users.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, display_name: true, avatar_url: true },
  });
  // Map userId to author summary
  const userMap: Record<string, IDiscussionBoardUser.ISummary> = {};
  for (const u of users) {
    userMap[u.id] = {
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url ?? undefined,
    };
  }
  // Map comment to ISummary
  const data = comments.map((comment) => ({
    id: comment.id,
    discussion_board_article_id: comment.discussion_board_article_id,
    author: userMap[comment.author_user_id],
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at
      ? toISOStringSafe(comment.updated_at)
      : undefined,
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  }));
  // Compose pagination
  const pagination = {
    current: pageNumber,
    limit: limitNumber,
    records: total,
    pages: Math.ceil(total / limitNumber),
  };
  return {
    pagination,
    data,
  };
}
