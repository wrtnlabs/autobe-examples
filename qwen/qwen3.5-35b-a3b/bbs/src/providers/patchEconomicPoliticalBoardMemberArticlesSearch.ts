import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardMemberArticlesSearch(props: {
  member: MemberPayload;
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit;
  // Validate page
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  // Determine final limit
  const effectiveLimit =
    limit !== undefined && limit !== null
      ? Math.min(Math.max(limit, 1), 50)
      : Math.min(Math.max(pageSize, 1), 50);
  const skip = (page - 1) * effectiveLimit;
  // Build WHERE clause
  const whereInput: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.sectionId !== undefined && {
      section_id: props.body.sectionId,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length >= 2 &&
      props.body.search.length <= 100 && {
        OR: [
          { title: { contains: props.body.search, mode: "insensitive" } },
          { content: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
    ...(props.body.search !== undefined &&
      (props.body.search.length < 2 || props.body.search.length > 100) && {
        AND: [], // Force no results for invalid search
      }),
    ...(props.body.tagId !== undefined && {
      articleTags: {
        some: {
          tag_id: props.body.tagId,
        },
      },
    }),
  };
  // Build ORDER BY clause
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.economic_political_board_articlesOrderByWithRelationInput =
    sortField === "title"
      ? { title: sortOrder as "asc" | "desc" }
      : sortField === "author_id"
        ? { author_id: sortOrder as "asc" | "desc" }
        : sortField === "updated_at"
          ? { updated_at: sortOrder as "asc" | "desc" }
          : { created_at: sortOrder as "asc" | "desc" };
  // Execute query
  const data = await MyGlobal.prisma.economic_political_board_articles.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: effectiveLimit,
      ...EconomicPoliticalBoardArticleAtSummaryTransformer.select(),
    },
  );
  // Execute count
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EconomicPoliticalBoardArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
