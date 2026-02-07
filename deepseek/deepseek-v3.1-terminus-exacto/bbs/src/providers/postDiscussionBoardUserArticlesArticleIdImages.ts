import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
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
import { DiscussionBoardArticleImageCollector } from "../collectors/DiscussionBoardArticleImageCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleImageTransformer } from "../transformers/DiscussionBoardArticleImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdImages(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  // First validate article exists and belongs to user
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      discussion_board_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Validate attachment file exists
  const attachmentFile =
    await MyGlobal.prisma.discussion_board_article_image_files.findFirst({
      where: {
        id: props.body.attachment_file_id,
      },
    });
  if (!attachmentFile) {
    throw new HttpException("Attachment file not found", 404);
  }
  // Collect the data for creation
  const collected = await DiscussionBoardArticleImageCollector.collect({
    body: props.body,
    discussionBoardArticles: { id: props.articleId },
  });
  // Create the image record
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: collected,
    ...DiscussionBoardArticleImageTransformer.select(),
  });
  // Transform to API response
  return await DiscussionBoardArticleImageTransformer.transform(created);
}
