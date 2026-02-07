import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestArticlesArticleIdFiles(props: {
  guest: GuestPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  // Verify article exists and guest has access
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Get pagination parameters with validation
  const page = 1; // Default page
  const limit = 10; // Default 10, max 100
  const skip = (page - 1) * limit;
  // Fetch paginated files
  const data = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Count total records
  const total = await MyGlobal.prisma.discussion_board_article_files.count({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  // Transform to response format
  const transformedData = data.map((file) => ({
    id: file.id,
    original_name: file.original_name,
    stored_path: file.stored_path,
    file_type: file.file_type,
    file_size: file.file_size,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
