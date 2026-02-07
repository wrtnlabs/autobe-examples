import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentAttachmentTransformer } from "../transformers/DiscussionBoardCommentAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdAttachmentsAttachmentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentAttachment> {
  // Validate article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Validate comment exists and belongs to article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to specified article",
      400,
    );
  }
  // Validate attachment exists and belongs to comment
  const attachment =
    await MyGlobal.prisma.discussion_board_comment_attachments.findUnique({
      where: { id: props.attachmentId },
      ...DiscussionBoardCommentAttachmentTransformer.select(),
    });
  if (!attachment) throw new HttpException("Attachment not found", 404);
  // Check if the attachment belongs to the comment by comparing comment IDs
  // Since the transformer select may not include the direct foreign key,
  // we need to check through the comment relationship
  if (attachment.comment.id !== props.commentId) {
    throw new HttpException(
      "Attachment does not belong to specified comment",
      400,
    );
  }
  return await DiscussionBoardCommentAttachmentTransformer.transform(
    attachment,
  );
}
