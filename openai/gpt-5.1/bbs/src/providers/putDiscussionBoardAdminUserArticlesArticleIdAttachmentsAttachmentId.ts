import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserArticlesArticleIdAttachmentsAttachmentId(props: {
  adminUser: AdminuserPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IUpdate;
}): Promise<IDiscussionBoardAttachment> {
  try {
    const existing =
      await MyGlobal.prisma.discussion_board_attachments.findFirst({
        where: {
          id: props.attachmentId,
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
      });

    if (existing === null) {
      throw new HttpException(
        "Attachment not found for the specified article.",
        404,
      );
    }

    const updateData = {
      ...(props.body.file_name !== undefined && {
        file_name: props.body.file_name,
      }),
      ...(props.body.content_type !== undefined && {
        content_type: props.body.content_type,
      }),
      ...(props.body.order_in_article !== undefined && {
        order_in_article: props.body.order_in_article,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      updated_at: toISOStringSafe(new Date()),
    };

    const updated = await MyGlobal.prisma.discussion_board_attachments.update({
      where: {
        id: props.attachmentId,
      },
      data: updateData,
    });

    return {
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
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Attachment order_in_article must be unique within the article.",
          409,
        );
      }
    }
    throw error;
  }
}
