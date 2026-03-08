import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const search = props.body.search;
  const parentCategoryId = props.body.parent_category_id;
  const isLeaf = props.body.is_leaf;
  const sortBy = props.body.sort_by ?? "name";
  const sortOrder = props.body.sort_order ?? "asc";
  const cursor = props.body.cursor;
  const cursorValues = cursor
    ? (JSON.parse(Buffer.from(cursor, "base64").toString("utf-8")) as {
        id: string & tags.Format<"uuid">;
      })
    : null;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(parentCategoryId !== undefined
      ? {
          parent_category_id: parentCategoryId,
        }
      : {}),
    ...(isLeaf !== undefined
      ? {
          is_leaf: isLeaf,
        }
      : {}),
    ...(cursorValues
      ? {
          id: {
            gt: cursorValues.id,
          },
        }
      : {}),
  };
  // Build order by with parent first for tree structure
  const orderByInput = [
    {
      parent_category_id: sortOrder,
    },
    {
      [sortBy]: sortOrder,
    },
  ] satisfies Prisma.ecommerce_mall_categoriesOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereConditions,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  const totalCount = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereConditions,
  });
  const records = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCategoryAtSummaryTransformer.transform,
  );
  const nextPageData = await MyGlobal.prisma.ecommerce_mall_categories.findMany(
    {
      where: { ...whereConditions, id: { gt: data[data.length - 1]?.id } },
      take: 1,
      orderBy: orderByInput,
    },
  );
  const nextCursor =
    nextPageData.length > 0
      ? Buffer.from(
          JSON.stringify({
            id: nextPageData[0].id,
          }),
        ).toString("base64")
      : null;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
    data: records,
  };
}
