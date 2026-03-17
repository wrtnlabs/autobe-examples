import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  // Validate category exists and is not deleted
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId, deleted_at: null },
      select: { id: true },
    });
  // Build category hierarchy filter (category + subcategories)
  const categoryIds = await buildCategoryHierarchy(props.categoryId);
  // Build where input
  const whereInput: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    status: "active",
    category_id: {
      in: categoryIds,
    },
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.min_price !== undefined && {
      base_price: {
        gte: props.body.min_price,
      },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: {
        lte: props.body.max_price,
      },
    }),
    ...(props.body.in_stock === true && {
      variants: {
        some: {
          stock_quantity: {
            gt: 0,
          },
          deleted_at: null,
        },
      },
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Order by
  const orderByInput: Prisma.ecommerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  // Fetch products
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereInput }),
  ]);
  // Transform results
  const transformed = await Promise.all(
    data.map((product) =>
      EcommerceMallProductAtSummaryTransformer.transform(product),
    ),
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallProduct.ISummary;
}
async function buildCategoryHierarchy(categoryId: string): Promise<string[]> {
  const categoryIds: string[] = [categoryId];
  async function collectSubcategories(parentId: string) {
    const subcategories =
      await MyGlobal.prisma.ecommerce_mall_categories.findMany({
        where: { parent_id: parentId, deleted_at: null },
        select: { id: true },
      });
    for (const sub of subcategories) {
      categoryIds.push(sub.id);
      await collectSubcategories(sub.id);
    }
  }
  await collectSubcategories(categoryId);
  return categoryIds;
}
