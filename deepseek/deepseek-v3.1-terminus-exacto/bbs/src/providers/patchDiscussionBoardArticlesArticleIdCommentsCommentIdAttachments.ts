import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdCommentsCommentIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.IRequest;
}): Promise<IPageIDiscussionBoardCommentAttachment.ISummary> {
  // Verify comment belongs to article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, discussion_board_article_id: true },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.discussion_board_article_id !== props.articleId)
    throw new HttpException("Comment does not belong to this article", 400);
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where clause without Date objects
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    file: {
      deleted_at: null,
      AND: [
        ...(props.body.search
          ? [
              {
                file_name: {
                  contains: props.body.search,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
        ...(props.body.file_type ? [{ file_type: props.body.file_type }] : []),
        ...(props.body.created_at_from
          ? [
              {
                created_at: {
                  gte: props.body.created_at_from, // Prisma can handle ISO strings
                },
              },
            ]
          : []),
        ...(props.body.created_at_to
          ? [
              {
                created_at: {
                  lte: props.body.created_at_to, // Prisma can handle ISO strings
                },
              },
            ]
          : []),
      ],
    },
  } satisfies Prisma.discussion_board_comment_attachmentsWhereInput;
  // Get paginated data with file metadata
  const data =
    await MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: whereInput,
      include: {
        file: {
          select: {
            file_name: true,
            file_type: true,
            file_size: true,
            created_at: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_comment_attachments.count({
      where: whereInput,
    });
  // Transform to summary format with proper dates
  const attachments = data.map((item) => ({
    id: item.id,
    file_name: item.file.file_name,
    file_type: item.file.file_type,
    file_size: item.file.file_size,
    created_at: toISOStringSafe(item.file.created_at),
  }));
  return {
    data: attachments,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
