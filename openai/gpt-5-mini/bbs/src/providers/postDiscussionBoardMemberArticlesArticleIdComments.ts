import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdComments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, body } = props;

  // Ensure acting member exists and is in good standing
  const dbMember =
    await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
      where: { id: member.id },
    });

  if (dbMember.deleted_at !== null) {
    throw new HttpException("Unauthorized: member account removed", 401);
  }
  if (dbMember.role === "suspended") {
    throw new HttpException("Forbidden: member suspended", 403);
  }

  // Validate target article
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
    });

  if (article.deleted_at !== null) throw new HttpException("Not Found", 404);
  if (article.state !== "published") throw new HttpException("Not Found", 404);

  // Parent comment validation & depth check
  const MAX_REPLY_DEPTH = 5;
  if (body.parentCommentId !== undefined && body.parentCommentId !== null) {
    const parent = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: body.parentCommentId },
    });

    if (!parent) throw new HttpException("Invalid parentCommentId", 400);
    if (parent.discussion_board_article_id !== articleId) {
      throw new HttpException(
        "Parent comment belongs to a different article",
        400,
      );
    }

    // Walk ancestry to enforce depth
    let depth = 1;
    let cursor = parent;
    while (cursor.discussion_board_parent_comment_id) {
      depth++;
      if (depth >= MAX_REPLY_DEPTH) {
        throw new HttpException("Reply depth exceeds allowed maximum", 400);
      }
      const next = await MyGlobal.prisma.discussion_board_comments.findUnique({
        where: { id: cursor.discussion_board_parent_comment_id },
      });
      if (!next) break;
      cursor = next;
    }
  }

  // Rate limiting (simple heuristic)
  const oneMinuteAgo = toISOStringSafe(new Date(Date.now() - 60 * 1000));
  const recentCount = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      discussion_board_author_id: member.id,
      created_at: { gte: oneMinuteAgo },
    },
  });
  const RATE_LIMIT_PER_MINUTE = 10;
  if (recentCount >= RATE_LIMIT_PER_MINUTE) {
    throw new HttpException("Too Many Requests", 429);
  }

  // Anti-abuse heuristic (daily threshold)
  const oneDayAgo = toISOStringSafe(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const dailyCount = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      discussion_board_author_id: member.id,
      created_at: { gte: oneDayAgo },
    },
  });
  const isHidden = dailyCount > 200;

  // Timestamps
  const now = toISOStringSafe(new Date());

  // Persist comment
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_article_id: articleId,
      discussion_board_author_id: member.id,
      discussion_board_parent_comment_id: body.parentCommentId ?? null,
      content: body.content,
      is_hidden: isHidden,
      created_at: now,
      updated_at: now,
    },
  });

  // Build author summary
  const authorSummary = dbMember
    ? {
        id: dbMember.id as string & tags.Format<"uuid">,
        username: dbMember.username,
        display_name: dbMember.display_name ?? null,
        created_at: toISOStringSafe(dbMember.created_at),
      }
    : null;

  return {
    id: created.id as string & tags.Format<"uuid">,
    articleId: created.discussion_board_article_id as string &
      tags.Format<"uuid">,
    parentCommentId:
      created.discussion_board_parent_comment_id === null
        ? null
        : (created.discussion_board_parent_comment_id as string &
            tags.Format<"uuid">),
    author: authorSummary,
    content: created.content,
    isHidden: created.is_hidden,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
