import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticlesArticleIdFilesFileId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify article exists and is accessible to users
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null, // Only access non-deleted articles
    },
    select: { id: true },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Retrieve the specific file attachment with article relation
  const fileAttachment =
    await MyGlobal.prisma.discussion_board_article_images.findUnique({
      where: {
        id: props.fileId,
        discussion_board_article_id: props.articleId,
        status: { in: ["active", "processing"] }, // Only active files
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  if (!fileAttachment) {
    throw new HttpException("File attachment not found", 404);
  }
  return await DiscussionBoardArticleFileTransformer.transform(fileAttachment);
}
