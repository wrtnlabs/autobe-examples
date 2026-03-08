import { IEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleTag";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticleTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardSectionsSectionIdTags(props: {
  sectionId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticleTag.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticleTag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const nameFilter = props.body.name;
  const sort = props.body.sort ?? "name";
  const sortOrder = props.body.sortOrder ?? "ASC";
  await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  const likePattern = nameFilter !== undefined ? `${nameFilter}%` : undefined;
  const whereArticleTagInput: Prisma.economic_political_board_article_tagsWhereInput =
    {
      article: {
        section_id: props.sectionId,
        deleted_at: null,
      },
      tag: {
        deleted_at: null,
        ...(likePattern !== undefined && { name: { startsWith: likePattern } }),
      },
    };
  const orderByArticleTag: Prisma.economic_political_board_article_tagsOrderByWithRelationInput =
    sort === "name"
      ? {
          tag: {
            name: (sortOrder === "ASC" ? "asc" : "desc") as "asc" | "desc",
          },
        }
      : sort === "createdAt"
        ? {
            article: {
              created_at: (sortOrder === "ASC" ? "asc" : "desc") as
                | "asc"
                | "desc",
            },
          }
        : sort === "articleCount"
          ? { id: (sortOrder === "ASC" ? "asc" : "desc") as "asc" | "desc" }
          : { article: { created_at: "asc" as const } };
  const [tagData, total] = await Promise.all([
    MyGlobal.prisma.economic_political_board_article_tags.findMany({
      where: whereArticleTagInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderByArticleTag,
      select: {
        id: true,
        tag: {
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
          },
        },
        article: { select: { created_at: true } },
      },
    }),
    MyGlobal.prisma.economic_political_board_article_tags.count({
      where: whereArticleTagInput,
    }),
  ]);
  const aggregated = new Map<
    string,
    {
      tag: Prisma.economic_political_board_tagsGetPayload<{
        select: {
          id: true;
          name: true;
          created_at: true;
          updated_at: true;
        };
      }>;
      articleCount: number;
      lastUsedAt: Date;
    }
  >();
  for (const row of tagData) {
    const tagId = row.tag.id;
    const existing = aggregated.get(tagId);
    if (existing) {
      existing.articleCount++;
      if (row.article.created_at > existing.lastUsedAt) {
        existing.lastUsedAt = row.article.created_at;
      }
    } else {
      aggregated.set(tagId, {
        tag: row.tag,
        articleCount: 1,
        lastUsedAt: row.article.created_at,
      });
    }
  }
  const sectionSummary =
    await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });
  const sectionData = {
    id: sectionSummary.id,
    name: sectionSummary.name,
    description: sectionSummary.description,
    created_at: toISOStringSafe(sectionSummary.created_at),
    articleCount: 0,
  } satisfies IEconomicPoliticalBoardSection.ISummary;
  const data: IEconomicPoliticalBoardArticleTag.ISummary[] = [];
  let startIndex = 0;
  for (const [tagId, agg] of aggregated.entries()) {
    const tagData: IEconomicPoliticalBoardTag.ISummary = {
      id: agg.tag.id,
      name: agg.tag.name,
      created_at: toISOStringSafe(agg.tag.created_at),
      updated_at: toISOStringSafe(agg.tag.updated_at),
    } satisfies IEconomicPoliticalBoardTag.ISummary;
    if (startIndex >= (page - 1) * limit && data.length < limit) {
      data.push({
        id: tagId,
        section: sectionData,
        tag: tagData,
        articleCount: agg.articleCount,
        createdAt: toISOStringSafe(agg.tag.created_at),
        lastUsedAt: toISOStringSafe(agg.lastUsedAt),
      });
    }
    startIndex++;
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: data,
  };
}
