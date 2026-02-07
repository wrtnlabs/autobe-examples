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
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Validate article exists and belongs to user
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: props.articleId,
      deleted_at: null,
      discussion_board_user_id: props.user.id,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or access denied", 404);
  }
  // Validate file constraints (basic implementation)
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  if (props.body.file_size > maxFileSize) {
    throw new HttpException("File size exceeds maximum limit", 400);
  }
  // Use collector to transform data with proper entity objects
  const createInput = await DiscussionBoardArticleFileCollector.collect({
    body: props.body,
    discussionBoardArticles: { id: props.articleId },
    discussionBoardUsers: { id: props.user.id },
  });
  // Create file attachment record
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: createInput,
    ...DiscussionBoardArticleFileTransformer.select(),
  });
  // Transform to response DTO
  return await DiscussionBoardArticleFileTransformer.transform(created);
}
