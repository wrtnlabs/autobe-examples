import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdCommentsCommentIdAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.ICreate;
}): Promise<IPageIDiscussionBoardCommentAttachment.ISummary> {
  const { member, articleId, commentId, body } = props;

  // Validate comment existence and association with article
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: commentId,
      discussion_board_article_id: articleId,
    },
  });

  if (!comment) throw new HttpException("Not Found", 404);

  // Authorization: only the comment author may add attachments
  if (comment.discussion_board_author_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only comment author can add attachments",
      403,
    );
  }

  // Prepare timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Atomic operation: enforce quota and create attachments
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.discussion_board_comment_attachments.count({
      where: { discussion_board_comment_id: commentId },
    });

    if (existing + body.attachments.length > 1) {
      throw new HttpException(
        "Bad Request: attachment quota exceeded for this comment",
        400,
      );
    }

    // Create each attachment record
    const creations = body.attachments.map((item) =>
      tx.discussion_board_comment_attachments.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_comment_id: commentId,
          discussion_board_uploaded_by_id: member.id,
          original_filename: item.original_filename,
          storage_key: item.storage_key,
          mime_type: item.mime_type,
          size: item.size,
          is_image: item.is_image ?? false,
          // Basic quarantine heuristic; real scanning integration should replace this
          quarantined:
            /application\/(x-msdownload|x-msdos-program)/i.test(
              item.mime_type,
            ) || item.size > 26214400,
          created_at: now,
        },
      }),
    );

    await Promise.all(creations);
  });

  // Retrieve current attachments for the comment (server-only storage_key kept internal)
  const attachments =
    await MyGlobal.prisma.discussion_board_comment_attachments.findMany({
      where: { discussion_board_comment_id: commentId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        discussion_board_comment_id: true,
        original_filename: true,
        mime_type: true,
        size: true,
        is_image: true,
        quarantined: true,
        created_at: true,
        discussion_board_uploaded_by_id: true,
        storage_key: true,
      },
    });

  // Build summaries without exposing storage_key; generate placeholder signed URLs
  const summaryPromises = attachments.map(async (r) => {
    const createdAt = r.created_at ? toISOStringSafe(r.created_at) : now;

    // If quarantined, do not provide a download URL.
    const downloadUrl = r.quarantined
      ? null
      : typia.random<string & tags.Format<"uri">>();

    let uploader: IDiscussionBoardMember.ISummary | null = null;
    if (r.discussion_board_uploaded_by_id) {
      const u = await MyGlobal.prisma.discussion_board_member.findUnique({
        where: { id: r.discussion_board_uploaded_by_id },
        select: {
          id: true,
          username: true,
          display_name: true,
          created_at: true,
        },
      });
      if (u) {
        uploader = {
          id: u.id as string & tags.Format<"uuid">,
          username: u.username,
          display_name: u.display_name ?? null,
          created_at: toISOStringSafe(u.created_at),
        };
      }
    }

    const summary: IDiscussionBoardCommentAttachment.ISummary = {
      id: r.id as string & tags.Format<"uuid">,
      commentId: r.discussion_board_comment_id as string & tags.Format<"uuid">,
      originalFilename: r.original_filename,
      mimeType: r.mime_type,
      size: r.size,
      isImage: r.is_image,
      quarantined: r.quarantined,
      createdAt,
      downloadUrl,
      cdnUrl: null,
      uploader,
    };

    return summary;
  });

  const data = await Promise.all(summaryPromises);

  const total =
    await MyGlobal.prisma.discussion_board_comment_attachments.count({
      where: { discussion_board_comment_id: commentId },
    });

  const limit = Number(body.attachments.length);

  return {
    pagination: {
      current: Number(1),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / Math.max(1, limit))),
    },
    data,
  };
}
