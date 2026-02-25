import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEconomicBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleTransformer } from "../transformers/EconomicBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEconomicBoardTags(props: {
  body: IEconomicBoardTag;
}): Promise<IPageIEconomicBoardArticle> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 15;
  const skip = (page - 1) * limit;
  // Normalize and validate tags
  const tags =
    props.body.tag
      ?.map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0) ?? [];
  if (tags.length > 10) {
    throw new HttpException("Too many tags provided. Max 10 allowed.", 400);
  }
  // Validate search term
  if (
    props.body.search &&
    (props.body.search.length < 3 || props.body.search.length > 100)
  ) {
    throw new HttpException("Search term must be 3-100 characters.", 400);
  }
  // Build where clause
  const where: Prisma.economic_board_articlesWhereInput = {
    is_deleted: false,
    ...(tags.length > 0 && {
      articleTags: {
        some: {
          tag: {
            in: tags,
          },
        },
      },
    }),
    ...(props.body.search && {
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
  };
  // Sort order - map string to SortOrder type
  const orderBy:
    | Prisma.SortOrder
    | {
        created_at: Prisma.SortOrder;
      } =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Fetch articles with transformer-select structure
  const articles = await MyGlobal.prisma.economic_board_articles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EconomicBoardArticleTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.economic_board_articles.count({ where });
  // Transform articles using existing transformer
  const transformedArticles = await ArrayUtil.asyncMap(
    articles,
    EconomicBoardArticleTransformer.transform,
  );
  return {
    data: transformedArticles,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
