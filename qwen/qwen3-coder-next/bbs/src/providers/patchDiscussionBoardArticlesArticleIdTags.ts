import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "../transformers/DiscussionBoardArticleTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_article_tags.findMany({
    where: {
      article_id: props.articleId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...DiscussionBoardArticleTagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_article_tags.count({
    where: {
      article_id: props.articleId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardArticleTagAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
