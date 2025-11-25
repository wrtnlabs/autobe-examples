import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";

export async function postDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.ICreate;
}): Promise<IDiscussionBoardArticleAttachment> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const attachment =
    await MyGlobal.prisma.discussion_board_article_attachments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        article_id: props.articleId,
        file_name: props.body.name,
        file_type: "application/octet-stream", // Consider deriving from actual file type
        file_size: 0, // Should be validated or derived from actual file size
        created_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: attachment.id,
    name: attachment.file_name,
    url: attachment.id, // Should be a pre-signed URL
  };
}
