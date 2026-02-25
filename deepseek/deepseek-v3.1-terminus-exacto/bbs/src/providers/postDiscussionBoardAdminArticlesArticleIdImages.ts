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
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdImages(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify the article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Verify the attachment file exists and is an image
  const attachmentFile =
    await MyGlobal.prisma.discussion_board_article_files.findUniqueOrThrow({
      where: { id: props.body.attachment_file_id },
    });
  // Validate it's an image file - fix: use file_type instead of mime_type
  if (!attachmentFile.file_type.startsWith("image/")) {
    throw new HttpException("Attachment file is not an image", 400);
  }
  // Use the collector to create the database input with proper entity wrapper
  const createData = await DiscussionBoardArticleFileCollector.collect({
    body: props.body,
    article: { id: props.articleId },
  });
  // Create the image attachment with status 'uploaded' as specified
  const createdImage =
    await MyGlobal.prisma.discussion_board_article_images.create({
      data: {
        ...createData,
        status: "uploaded", // Set initial status
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(createdImage);
}
