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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdFiles(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // First, verify the article exists and get the first file for this article
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId, deleted_at: null },
    });
  // Find the first file attachment for this article
  const existingFile =
    await MyGlobal.prisma.discussion_board_article_images.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        status: "active",
      },
    });
  if (!existingFile) {
    throw new HttpException("No file attachments found for this article", 404);
  }
  // Update the file metadata
  await MyGlobal.prisma.discussion_board_article_images.update({
    where: {
      id: existingFile.id,
      discussion_board_article_id: props.articleId,
    },
    data: {
      display_order: props.body.display_order,
      alt_text: props.body.alt_text ?? undefined,
      caption: props.body.caption ?? undefined,
    },
  });
  // Retrieve the updated file with complete relations
  const updatedFile =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: { id: existingFile.id },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(updatedFile);
}
