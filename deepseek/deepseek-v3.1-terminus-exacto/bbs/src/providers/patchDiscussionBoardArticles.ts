import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
    status: "published",
  };
  if (props.body.discussion_board_section_id) {
    whereConditions.discussion_board_section_id =
      props.body.discussion_board_section_id;
  }
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = `%${props.body.search}%`;
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const orderByInput: Prisma.discussion_board_articlesOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardArticleAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereConditions,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardArticleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
