import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleFileCollector } from "../collectors/DiscussionBoardArticleFileCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdFiles(props: {
  user: UserPayload;
  articleId: string;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // 1. Find article and verify ownership
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        discussion_board_user_id: true,
      },
    });
  // 2. Verify user is the article author
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Only the article author can attach files", 403);
  }
  // 3. Check file count limit (max 10 files per article)
  const fileCount = await MyGlobal.prisma.discussion_board_article_files.count({
    where: { discussion_board_article_id: props.articleId },
  });
  if (fileCount >= 10) {
    throw new HttpException("Maximum 10 files allowed per article", 400);
  }
  // 4. Check total file size limit (max 50MB per article)
  const totalSizeResult =
    await MyGlobal.prisma.discussion_board_article_files.aggregate({
      where: { discussion_board_article_id: props.articleId },
      _sum: { file_size: true },
    });
  const currentTotalSize = totalSizeResult._sum.file_size ?? 0;
  const newTotalSize = currentTotalSize + props.body.file_size;
  const maxTotalSize = 50 * 1024 * 1024; // 50MB
  if (newTotalSize > maxTotalSize) {
    throw new HttpException(
      "Total file size cannot exceed 50MB per article",
      400,
    );
  }
  // 5. Create file using Collector
  const fileData = await DiscussionBoardArticleFileCollector.collect({
    body: props.body,
    discussionBoardArticles: { id: props.articleId },
  });
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: fileData,
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  // 6. Transform and return using Transformer
  return await DiscussionBoardArticleFileTransformer.transform(created);
}
