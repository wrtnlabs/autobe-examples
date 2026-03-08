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
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";
import { EconomicPoliticalBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardArticleAtSummaryTransformer";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardMemberArticles(props: {
  member: MemberPayload;
  body: IEconomicPoliticalBoardArticle.IRequest;
}): Promise<IPageIEconomicPoliticalBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  if (page < 1) {
    throw new HttpException("page must be at least 1", 400);
  }
  if (limit < 0 || limit > 50) {
    throw new HttpException("limit must be between 0 and 50", 400);
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economic_political_board_articlesWhereInput = {
    deleted_at: null,
    ...(props.body.sectionId !== undefined && {
      section_id: props.body.sectionId,
    }),
    ...(props.body.tagId !== undefined && {
      articleTags: {
        some: {
          tag: {
            id: props.body.tagId,
          },
        },
      },
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
  } satisfies Prisma.economic_political_board_articlesWhereInput;
  const validSortFields: ReadonlyArray<
    "created_at" | "updated_at" | "title" | "author_id"
  > = ["created_at", "updated_at", "title", "author_id"];
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  if (!validSortFields.includes(sortField)) {
    throw new HttpException("Invalid sort field", 400);
  }
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new HttpException("Invalid sort order", 400);
  }
  const orderByInput: Prisma.economic_political_board_articlesOrderByWithRelationInput =
    sortField === "updated_at"
      ? { updated_at: sortOrder }
      : sortField === "title"
        ? { title: sortOrder }
        : sortField === "author_id"
          ? { author_id: sortOrder }
          : { created_at: sortOrder };
  const data = await MyGlobal.prisma.economic_political_board_articles.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        author_id: true,
        section_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comments: true,
        attachments: true,
        articleTags: {
          select: {
            id: true,
            tag_id: true,
            article_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        author:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        section: EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
      } satisfies Prisma.economic_political_board_articlesSelect,
    } satisfies Prisma.economic_political_board_articlesFindManyArgs,
  );
  const total = await MyGlobal.prisma.economic_political_board_articles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EconomicPoliticalBoardArticleAtSummaryTransformer.transform,
    ),
  };
}
