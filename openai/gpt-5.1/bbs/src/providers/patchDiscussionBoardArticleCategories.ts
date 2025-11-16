import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticleCategories(props: {
  body: IDiscussionBoardArticleCategory.IRequest;
}): Promise<IPageIDiscussionBoardArticleCategory.ISummary> {
  const body = props.body;

  const requestedPage = body.page ?? 1;
  const requestedLimit = body.limit ?? 20;

  const normalizedPage = requestedPage < 1 ? 1 : requestedPage;
  const effectiveLimit = requestedLimit < 0 ? 0 : requestedLimit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? {
          OR: [
            { name: { contains: body.search, mode: "insensitive" as const } },
            {
              description: {
                contains: body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(Array.isArray(body.codes) && body.codes.length > 0
      ? { code: { in: body.codes } }
      : {}),
  } satisfies Prisma.discussion_board_article_categoriesWhereInput;

  const orderByFieldRaw = body.order_by ?? "order";
  const orderDirectionRaw = body.order_direction ?? "asc";

  const loweredDirection =
    typeof orderDirectionRaw === "string"
      ? orderDirectionRaw.toLowerCase()
      : "asc";

  const normalizedDirection =
    loweredDirection === "asc" || loweredDirection === "desc"
      ? loweredDirection
      : "asc";

  // Ensure the value is typed as Prisma.SortOrder ("asc" | "desc")
  const sortDirection: Prisma.SortOrder =
    normalizedDirection === "desc" ? "desc" : "asc";

  const orderByField =
    orderByFieldRaw === "created_at" || orderByFieldRaw === "order"
      ? orderByFieldRaw
      : "order";

  const orderBy: Prisma.discussion_board_article_categoriesOrderByWithRelationInput[] =
    orderByField === "order"
      ? [{ order: sortDirection }, { created_at: sortDirection }]
      : [{ created_at: sortDirection }];

  const skip = effectiveLimit > 0 ? (normalizedPage - 1) * effectiveLimit : 0;

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_categories.findMany({
      where,
      orderBy,
      skip,
      take: effectiveLimit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.discussion_board_article_categories.count({
      where,
    }),
  ]);

  const records = totalCount;
  const pages = effectiveLimit > 0 ? Math.ceil(records / effectiveLimit) : 0;

  const clampedCurrent =
    pages === 0
      ? 0
      : (() => {
          const requestedZeroBased = normalizedPage - 1;
          if (requestedZeroBased < 0) return 0;
          if (requestedZeroBased >= pages) return pages - 1;
          return requestedZeroBased;
        })();

  const data: IDiscussionBoardArticleCategory.ISummary[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
  }));

  const pagination: IPage.IPagination = {
    current: clampedCurrent,
    limit: effectiveLimit,
    records,
    pages,
  };

  return {
    pagination,
    data,
  };
}
