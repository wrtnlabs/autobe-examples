import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
  articleId: string;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  // 1. Article verification
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_user_id: true,
        deleted_at: true,
      },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Ban status check
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { is_banned: true },
  });
  if (user.is_banned) {
    throw new HttpException("User is banned", 403);
  }
  // 3. Image count validation
  const imageCount =
    await MyGlobal.prisma.discussion_board_article_images.count({
      where: { discussion_board_article_id: props.articleId },
    });
  if (imageCount >= 20) {
    throw new HttpException("Maximum of 20 images per article exceeded", 400);
  }
  // 4. Total size validation (25MB = 26,214,400 bytes)
  const sizeAggregation =
    await MyGlobal.prisma.discussion_board_article_images.aggregate({
      where: { discussion_board_article_id: props.articleId },
      _sum: { file_size: true },
    });
  const existingTotalSize = sizeAggregation._sum.file_size ?? 0;
  const newTotalSize = existingTotalSize + props.body.file_size;
  if (newTotalSize > 26214400) {
    throw new HttpException(
      "Total image size per article cannot exceed 25MB",
      400,
    );
  }
  // 5. Create image using Collector
  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: await DiscussionBoardArticleImageCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId },
    }),
    ...DiscussionBoardArticleImageTransformer.select(),
  });
  // 6. Transform and return
  return await DiscussionBoardArticleImageTransformer.transform(created);
}
