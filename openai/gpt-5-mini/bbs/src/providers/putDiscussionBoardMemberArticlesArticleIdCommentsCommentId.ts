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

export async function putDiscussionBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IUpdate;
}): Promise<IDiscussionBoardComment> {
  const { member, articleId, commentId, body } = props;

  const existing = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
  });

  if (!existing) throw new HttpException("Not Found", 404);

  if (existing.discussion_board_author_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only edit your own comment",
      403,
    );
  }

  const envRecord = MyGlobal.env as unknown as Record<string, unknown>;
  const editWindowMs =
    Number(envRecord["COMMENT_EDIT_WINDOW_MS"] ?? 15 * 60 * 1000) ||
    15 * 60 * 1000;

  const createdAtMs = Date.parse(toISOStringSafe(existing.created_at));
  const nowMs = Date.parse(toISOStringSafe(new Date()));
  if (nowMs - createdAtMs > editWindowMs) {
    throw new HttpException("Edit window expired", 409);
  }

  const nowIso = toISOStringSafe(new Date());

  const [updated] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_comments.update({
      where: { id: commentId },
      data: {
        content: body.content ?? undefined,
        updated_at: nowIso,
      },
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_parent_comment_id: true,
        discussion_board_author_id: true,
        content: true,
        is_hidden: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "comment.updated",
        event_payload: JSON.stringify({
          commentId,
          articleId,
          authorId: member.id,
          before: existing.content,
          after: body.content,
        }),
        occurred_at: nowIso,
      },
    }),
  ]);

  const result: IDiscussionBoardComment = {
    id: updated.id as string & tags.Format<"uuid">,
    articleId: updated.discussion_board_article_id as string &
      tags.Format<"uuid">,
    parentCommentId:
      updated.discussion_board_parent_comment_id === null
        ? undefined
        : (updated.discussion_board_parent_comment_id as string &
            tags.Format<"uuid">),
    author: updated.author
      ? {
          id: updated.author.id as string & tags.Format<"uuid">,
          username: updated.author.username,
          display_name: updated.author.display_name ?? null,
          created_at: toISOStringSafe(updated.author.created_at),
        }
      : null,
    content: updated.content,
    isHidden: updated.is_hidden,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };

  return result;
}
