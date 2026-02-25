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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardArticlesArticleIdFiles(props: {
  articleId: string;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile.ISummary> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Simulate file storage path (in production, this would use actual storage)
  const filePath = `/uploads/articles/${props.articleId}/${v4()}-${props.body.originalFilename}`;
  // Calculate file size (in production, this would come from actual file upload)
  const fileSize = 1024 * 1024; // Default 1MB for simulation
  // Create file record using collector
  const fileRecord =
    await MyGlobal.prisma.discussion_board_article_files.create({
      data: await DiscussionBoardArticleFileCollector.collect({
        body: props.body,
        discussionBoardArticle: article,
        filePath: filePath,
        fileSize: fileSize,
      }),
      select: {
        id: true,
        original_filename: true,
        file_path: true,
        mime_type: true,
        file_size: true,
        article: {
          select: { id: true },
        },
      },
    });
  // Transform to summary format
  return {
    id: fileRecord.id,
    original_filename: fileRecord.original_filename,
    file_path: fileRecord.file_path,
    mime_type: fileRecord.mime_type,
    file_size: fileRecord.file_size,
    article_id: fileRecord.article.id,
  };
}
