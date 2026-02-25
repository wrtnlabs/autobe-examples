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

// Note: AdminPayload import comes from decorator context
export async function putDiscussionBoardAdminArticlesArticleIdFilesFileId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IUpdate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Verify the file exists and belongs to the specified article
  const existingFile =
    await MyGlobal.prisma.discussion_board_article_images.findFirstOrThrow({
      where: {
        id: props.fileId,
        discussion_board_article_id: props.articleId,
      },
    });
  // Update the file with the provided metadata
  const updatedFile =
    await MyGlobal.prisma.discussion_board_article_images.update({
      where: { id: props.fileId },
      data: {
        display_order: props.body.display_order,
        alt_text: props.body.alt_text ?? null,
        caption: props.body.caption ?? null,
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  // Transform and return the updated file
  return await DiscussionBoardArticleFileTransformer.transform(updatedFile);
}
