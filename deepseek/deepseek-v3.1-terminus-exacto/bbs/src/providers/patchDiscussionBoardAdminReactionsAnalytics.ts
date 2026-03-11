import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleReaction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleReactionAtSummaryTransformer } from "../transformers/DiscussionBoardArticleReactionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminReactionsAnalytics(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleReaction.IRequest;
}): Promise<IPageIDiscussionBoardArticleReaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereConditions: Prisma.discussion_board_article_reactionsWhereInput = {
    ...(props.body.reaction_type && {
      reaction_type: props.body.reaction_type,
    }),
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
  };
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_article_reactions.count({
    where: whereConditions,
  });
  // Get paginated data with transformer
  const data =
    await MyGlobal.prisma.discussion_board_article_reactions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardArticleReactionAtSummaryTransformer.select(),
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleReactionAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
