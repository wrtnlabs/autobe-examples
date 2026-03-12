import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

export async function patchDiscussionBoardTagsArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = body.sortBy ?? "createdAt";
  const sortOrder = body.sortOrder ?? "desc";
  const orderByInput = (
    sortBy === "createdAt"
      ? { created_at: sortOrder }
      : sortBy === "updatedAt"
        ? { updated_at: sortOrder }
        : { title: sortOrder }
  ) satisfies Prisma.discussion_board_articlesOrderByWithRelationInput;
  const baseWhereInput: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (body.search != null && body.search.length > 0) {
    baseWhereInput.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { content: { contains: body.search, mode: "insensitive" } },
    ];
  }
  if (body.section_id != null) {
    baseWhereInput.discussion_board_section_id = body.section_id;
  }
  if (body.author_id != null) {
    baseWhereInput.discussion_board_member_id = body.author_id;
  }
  if (body.from_date != null) {
    baseWhereInput.created_at = {
      gte: new Date(body.from_date),
    };
  }
  if (body.to_date != null) {
    if (baseWhereInput.created_at != null) {
      (baseWhereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
        body.to_date,
      );
    } else {
      baseWhereInput.created_at = {
        lte: new Date(body.to_date),
      };
    }
  }
  let whereInput = baseWhereInput;
  if (body.tag_ids != null && body.tag_ids.length > 0) {
    const requiredTagCount = body.tag_ids.length;
    const articlesWithAllTags =
      await MyGlobal.prisma.discussion_board_articles.findMany({
        where: baseWhereInput,
        include: {
          articleTags: {
            where: {
              discussion_board_tag_id: {
                in: body.tag_ids,
              },
              tag: {
                deleted_at: null,
              },
            },
            select: {
              id: true,
            },
          },
        },
      });
    const matchingArticleIds = articlesWithAllTags
      .filter((article) => article.articleTags.length === requiredTagCount)
      .map((article) => article.id);
    whereInput = {
      ...baseWhereInput,
      id: {
        in: matchingArticleIds,
      },
    };
  }
  const data = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardArticleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_articles.count({
    where: whereInput,
  });
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
