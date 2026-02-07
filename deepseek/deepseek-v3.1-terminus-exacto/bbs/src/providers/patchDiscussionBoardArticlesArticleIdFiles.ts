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
import { DiscussionBoardArticleFileAtSummaryTransformer } from "../transformers/DiscussionBoardArticleFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdFiles(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Build where conditions with proper date handling
  const whereInput: Prisma.discussion_board_article_filesWhereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
  };
  // Add search filter if provided
  if (props.body.search) {
    whereInput.file_name = { contains: props.body.search, mode: "insensitive" };
  }
  // Add file type filter if provided
  if (props.body.file_type) {
    whereInput.file_type = props.body.file_type;
  }
  // Add date range filters with proper ISO string handling
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      // Use direct string comparison for ISO dates since Prisma handles ISO strings correctly
      whereInput.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = props.body.created_at_end;
    }
  }
  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Execute queries sequentially for better performance characteristics
  const data = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardArticleFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_article_files.count({
    where: whereInput,
  });
  // Transform results using async mapping
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleFileAtSummaryTransformer.transform,
  );
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
