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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardArticleReactionAtSummaryTransformer } from "../transformers/DiscussionBoardArticleReactionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminReactionsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardArticleReaction.IRequest;
}): Promise<IPageIDiscussionBoardArticleReaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date parsing
  const whereInput = {
    ...(props.body.reaction_type && {
      reaction_type: props.body.reaction_type,
    }),
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start), // Prisma expects Date object for DateTime field
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end), // Prisma expects Date object for DateTime field
      },
    }),
  } satisfies Prisma.discussion_board_article_reactionsWhereInput;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.discussion_board_article_reactions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardArticleReactionAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_reactions.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    return await DiscussionBoardArticleReactionAtSummaryTransformer.transform(
      item,
    );
  });
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
