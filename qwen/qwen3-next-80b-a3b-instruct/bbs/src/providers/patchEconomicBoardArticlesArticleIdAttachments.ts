import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleAttachmentAtSummaryTransformer } from "../transformers/EconomicBoardArticleAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicBoardArticle.IRequest;
}): Promise<IPageIEconomicBoardArticleAttachment.ISummary> {
  // 1. Validate article exists and user has permission to view
  const article =
    await MyGlobal.prisma.economic_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { is_deleted: true },
    });
  // If article is deleted, prevent access (could be soft-deleted)
  if (article.is_deleted) {
    throw new HttpException("Article not found", 404);
  }
  // 2. Build WHERE clause based on request filters
  const whereInput = {
    article_id: props.articleId,
  } satisfies Prisma.economic_board_article_attachmentsWhereInput;
  // Add tag filter if provided: JOIN with economic_board_article_tags
  if (props.body.tag) {
    // Must join through article_tags junction table
    // The tag is stored as string on economic_board_article_tags.tag
    // So we need to find all articles with this tag, then filter attachments by article_id
    // Since this is about attachments of a specific article, tag filter does NOT apply.
    // The spec says: "This operation provides access to all attachments linked to the article"
    // Therefore, tag filter is ignored for this endpoint.
    // Same for search, section_id, sort — these are for article list, not attachment list.
  }
  // 3. Pagination configuration
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Query attachments with full transformer select
  const data =
    await MyGlobal.prisma.economic_board_article_attachments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EconomicBoardArticleAttachmentAtSummaryTransformer.select(),
    });
  // 5. Count total attachments for pagination
  const total = await MyGlobal.prisma.economic_board_article_attachments.count({
    where: whereInput,
  });
  // 6. Transform and return paginated result
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardArticleAttachmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
