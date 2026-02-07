import { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchResult";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardUserResults(props: {
  user: UserPayload;
  body: IEconomyPoliticsBoardSearchResult.IRequest;
}): Promise<IPageIEconomyPoliticsBoardSearchResult.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.articleId && { article_id: props.body.articleId }),
    ...(props.body.tagId && { article_tags_id: props.body.tagId }),
    ...(props.body.fromDate && { created_at: { gte: props.body.fromDate } }),
    ...(props.body.toDate && { created_at: { lte: props.body.toDate } }),
  };
  const results =
    await MyGlobal.prisma.economy_politics_board_search_results.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        article: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
              },
            },
            created_at: true,
          },
        },
        tag: {
          select: {
            id: true,
            tag: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.economy_politics_board_search_results.count({
      where: whereInput,
    });
  const transformedData = await Promise.all(
    results
      .filter((result) => result.article != null)
      .map(async (result) => {
        const article = {
          id: result.article.id,
          title: result.article.title,
          author: {
            id: result.article.author.id,
            email: result.article.author.email,
            created_at: toISOStringSafe(result.article.author.created_at),
            updated_at: toISOStringSafe(result.article.author.updated_at),
            deleted_at: result.article.author.deleted_at
              ? toISOStringSafe(result.article.author.deleted_at)
              : null,
          },
          section: {
            id: result.article.section.id,
            name: result.article.section.name,
            description: result.article.section.description,
            created_at: toISOStringSafe(result.article.section.created_at),
          },
          created_at: toISOStringSafe(result.article.created_at),
          comments_count: 0,
        };
        const tag = {
          id: result.tag.id,
          tag: result.tag.tag,
          created_at: toISOStringSafe(result.tag.created_at),
          updated_at: toISOStringSafe(result.tag.updated_at),
          deleted_at: result.tag.deleted_at
            ? toISOStringSafe(result.tag.deleted_at)
            : null,
        };
        return {
          id: result.id,
          article,
          tag,
          created_at: toISOStringSafe(result.created_at),
          updated_at: toISOStringSafe(result.updated_at),
          deleted_at: result.deleted_at
            ? toISOStringSafe(result.deleted_at)
            : null,
        };
      }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
