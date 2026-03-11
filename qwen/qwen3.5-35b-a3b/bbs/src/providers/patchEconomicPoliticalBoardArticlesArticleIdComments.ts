import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardCommentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardComment.IRequest;
}): Promise<IPageIEconomicPoliticalBoardComment.ISummary> {
  // Validate article exists
  await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sort direction
  const orderBy: Prisma.economic_political_board_commentsOrderByWithRelationInput[] =
    props.body.sortDirection === "oldest"
      ? [{ created_at: "asc" }]
      : [{ created_at: "desc" }];
  // Author filter
  const whereInput: Prisma.economic_political_board_commentsWhereInput = {
    article_id: props.articleId,
    deleted_at: null,
    ...(props.body.authorId !== undefined && {
      author_id: props.body.authorId,
    }),
  } satisfies Prisma.economic_political_board_commentsWhereInput;
  // Fetch paginated comments with nested relations
  const data = await MyGlobal.prisma.economic_political_board_comments.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...EconomicPoliticalBoardCommentAtSummaryTransformer.select(),
    },
  );
  // Get total count
  const total = await MyGlobal.prisma.economic_political_board_comments.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardCommentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEconomicPoliticalBoardComment.ISummary;
}
