import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleViewAtSummaryTransformer } from "../transformers/DiscussionBoardArticleViewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdViews(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleView.IRequest;
}): Promise<IPageIDiscussionBoardArticleView.ISummary> {
  // Validate article exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? pageSize;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.viewedAtFrom && {
      viewed_at: {
        gte: new Date(props.body.viewedAtFrom),
      },
    }),
    ...(props.body.viewedAtTo && {
      viewed_at: {
        lte: new Date(props.body.viewedAtTo),
      },
    }),
    ...(props.body.memberId !== undefined &&
      props.body.memberId !== null && {
        discussion_board_member_id: props.body.memberId,
      }),
    ...(props.body.sessionId !== undefined &&
      props.body.sessionId !== null && {
        discussion_board_member_session_id: props.body.sessionId,
      }),
  } satisfies Prisma.discussion_board_article_viewsWhereInput;
  // Build order by clause
  const orderByInput = (
    props.body.sortOrder === "asc"
      ? { viewed_at: "asc" as const }
      : { viewed_at: "desc" as const }
  ) satisfies Prisma.discussion_board_article_viewsOrderByWithRelationInput;
  // Fetch paginated data
  const data = await MyGlobal.prisma.discussion_board_article_views.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardArticleViewAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_views.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleViewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
