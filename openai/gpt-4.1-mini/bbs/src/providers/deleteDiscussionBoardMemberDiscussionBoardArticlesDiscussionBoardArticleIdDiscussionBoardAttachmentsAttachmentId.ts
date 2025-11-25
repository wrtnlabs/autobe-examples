import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberDiscussionBoardArticlesDiscussionBoardArticleIdDiscussionBoardAttachmentsAttachmentId(props: {
  member: MemberPayload;
  discussionBoardArticleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.discussionBoardArticleId },
    select: { discussion_board_member_id: true },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.attachmentId,
        discussion_board_article_id: props.discussionBoardArticleId,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  await MyGlobal.prisma.discussion_board_attachments.delete({
    where: { id: props.attachmentId },
  });
}
