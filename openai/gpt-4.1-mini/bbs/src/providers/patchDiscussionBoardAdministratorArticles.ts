import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticles(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where,
  });
  const summarizedData = data.map((article) => ({
    id: article.id,
    title: article.title,
    created_at: toISOStringSafe(article.created_at),
    author_display_name: null,
    tags: [],
    comment_count: 0,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: summarizedData,
  };
}
