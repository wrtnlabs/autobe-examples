import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleTagMappingAtSummaryTransformer } from "../transformers/DiscussionBoardArticleTagMappingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticleTagMappings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardArticleTagMapping.IRequest;
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  const { articleId, tagId, page = 1, limit = 20, sort, search } = props.body;
  if (page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.discussion_board_article_tag_mappingsWhereInput = {
    deleted_at: null,
  };
  if (articleId) {
    where.discussion_board_article_id = articleId;
  }
  if (tagId) {
    where.discussion_board_tag_id = tagId;
  }
  if (search) {
    where.AND = [
      {
        OR: [
          {
            article: {
              title: { contains: search, mode: "insensitive" },
            },
          },
          {
            tag: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      },
    ];
  }
  let orderBy:
    | Prisma.discussion_board_article_tag_mappingsOrderByWithRelationInput
    | undefined = undefined;
  if (sort) {
    const [field, direction] = sort.split(" ");
    if (["asc", "desc"].includes(direction)) {
      orderBy = { [field]: direction };
    }
  }
  if (!orderBy) {
    orderBy = { created_at: "desc" };
  }
  const skip = (page - 1) * limit;
  const rows =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...DiscussionBoardArticleTagMappingAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.count({
      where,
    });
  return {
    data: await Promise.all(
      rows.map(DiscussionBoardArticleTagMappingAtSummaryTransformer.transform),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIDiscussionBoardArticleTagMapping.ISummary;
}
