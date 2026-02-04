import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { EconomicDiscussionCommentAtSummaryTransformer } from "../transformers/EconomicDiscussionCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionCitizenArticlesArticleIdComments(props: {
  citizen: CitizenPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IPageIEconomicDiscussionComment.ISummary> {
  // Verify article exists (using the articleId to check existence)
  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );
  if (!article) {
    throw new HttpException("Article not found or has been deleted", 404);
  }
  // Query comments with author information
  const data = await MyGlobal.prisma.economic_discussion_comments.findMany({
    where: { economic_discussion_article_id: props.articleId },
    orderBy: { created_at: "asc" },
    take: 1000,
    ...EconomicDiscussionCommentAtSummaryTransformer.select(),
  });
  // Count total comments
  const total = await MyGlobal.prisma.economic_discussion_comments.count({
    where: { economic_discussion_article_id: props.articleId },
  });
  // Transform data using the loaded transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicDiscussionCommentAtSummaryTransformer.transform,
  );
  // Return pagination structure
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: 1000,
      records: total,
      pages: Math.ceil(total / 1000),
    } satisfies IPage.IPagination,
  };
}
