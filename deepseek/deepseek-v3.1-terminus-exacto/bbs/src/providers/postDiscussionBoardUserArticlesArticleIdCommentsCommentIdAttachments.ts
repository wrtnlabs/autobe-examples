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
import { DiscussionBoardCommentAttachmentCollector } from "../collectors/DiscussionBoardCommentAttachmentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentAttachmentTransformer } from "../transformers/DiscussionBoardCommentAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdCommentsCommentIdAttachments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentAttachment.ICreate;
}): Promise<IDiscussionBoardCommentAttachment> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // Validate article exists and is accessible
    const article = await prisma.discussion_board_articles.findUnique({
      where: { id: props.articleId, deleted_at: null },
    });
    if (!article)
      throw new HttpException("Article not found or inaccessible", 404);
    // Validate comment exists and belongs to the specified article
    const comment = await prisma.discussion_board_comments.findUnique({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
    if (!comment)
      throw new HttpException(
        "Comment not found or does not belong to the specified article",
        404,
      );
    // Check user permission - only comment author can attach files
    if (comment.discussion_board_user_id !== props.user.id) {
      throw new HttpException(
        "You can only attach files to your own comments",
        403,
      );
    }
    // Validate file attachment exists and is accessible
    const file = await prisma.discussion_board_article_files.findUnique({
      where: { id: props.body.discussion_board_article_file_id },
    });
    if (!file) throw new HttpException("File attachment not found", 404);
    // Check if attachment relationship already exists
    const existingAttachment =
      await prisma.discussion_board_comment_attachments.findUnique({
        where: {
          discussion_board_comment_id_discussion_board_article_file_id: {
            discussion_board_comment_id: props.commentId,
            discussion_board_article_file_id:
              props.body.discussion_board_article_file_id,
          },
        },
      });
    if (existingAttachment)
      throw new HttpException("File is already attached to this comment", 409);
    // Create the attachment relationship using collector
    const attachment = await prisma.discussion_board_comment_attachments.create(
      {
        data: await DiscussionBoardCommentAttachmentCollector.collect({
          body: props.body,
          discussionBoardComments: { id: props.commentId },
        }),
        ...DiscussionBoardCommentAttachmentTransformer.select(),
      },
    );
    return await DiscussionBoardCommentAttachmentTransformer.transform(
      attachment,
    );
  });
}
