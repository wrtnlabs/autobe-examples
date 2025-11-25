import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putDiscussionBoardMemberUserArticlesArticleIdAttachmentsAttachmentId(props: {
  memberUser: MemberuserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  const memberUserId = props.memberUser.id;

  // Verify that the parent article exists and is not logically deleted.
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // Ownership check: only the owning member user can update attachments via memberUser endpoint.
  if (
    "discussion_board_memberuser_id" in article &&
    article.discussion_board_memberuser_id !== memberUserId
  ) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch the attachment scoped to this article.
  const existing = await MyGlobal.prisma.discussion_board_attachments.findFirst(
    {
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.articleId,
      },
    },
  );

  if (existing === null) {
    throw new HttpException("Attachment not found for this article", 404);
  }

  // Business rule: do not allow updates on logically deleted attachments.
  if (existing.deleted_at !== null) {
    throw new HttpException(
      "Attachment has been deleted and cannot be updated",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  try {
    const updated = await MyGlobal.prisma.discussion_board_attachments.update({
      where: {
        id: props.attachmentId,
      },
      data: {
        ...(props.body.file_name !== undefined
          ? { file_name: props.body.file_name }
          : {}),
        ...(props.body.content_type !== undefined
          ? { content_type: props.body.content_type }
          : {}),
        ...(props.body.order_in_article !== undefined
          ? { order_in_article: props.body.order_in_article }
          : {}),
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        updated_at: now,
      },
    });

    const base: IDiscussionBoardAttachment = {
      id: updated.id,
      discussion_board_article_id: updated.discussion_board_article_id,
      file_uri: updated.file_uri,
      file_name: updated.file_name,
      content_type: updated.content_type,
      file_size: updated.file_size,
      order_in_article: updated.order_in_article,
      status: updated.status,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };

    if (updated.deleted_at !== null) {
      return {
        ...base,
        deleted_at: toISOStringSafe(updated.deleted_at),
      };
    }

    return base;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation, e.g., on (discussion_board_article_id, order_in_article)
      if (error.code === "P2002") {
        throw new HttpException(
          "Attachment order_in_article must be unique within the article",
          400,
        );
      }
    }
    throw error;
  }
}
