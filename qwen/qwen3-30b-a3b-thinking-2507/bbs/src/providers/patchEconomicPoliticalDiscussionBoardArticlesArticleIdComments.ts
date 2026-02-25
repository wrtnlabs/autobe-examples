import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardCommentAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalDiscussionBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalDiscussionBoardComment.IRequest;
}): Promise<IPageIEconomicPoliticalDiscussionBoardComment.ISummary> {
  const { page = 1, limit = 15, search = props.body.search } = props.body;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_political_discussion_board_comments.findMany({
      where: {
        article_id: props.articleId,
        deleted_at: null,
        ...(search && { content: { contains: search, mode: "insensitive" } }),
      },
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
      ...EconomicPoliticalDiscussionBoardCommentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_political_discussion_board_comments.count({
      where: {
        article_id: props.articleId,
        deleted_at: null,
        ...(search && { content: { contains: search, mode: "insensitive" } }),
      },
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalDiscussionBoardCommentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
