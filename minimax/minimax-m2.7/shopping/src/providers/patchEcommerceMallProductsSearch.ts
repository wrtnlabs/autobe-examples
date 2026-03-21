import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function patchEcommerceMallProductsSearch(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get category and all subcategory IDs if category filter is provided
  let categoryIds: string[] | undefined;
  if (props.body.categoryId !== undefined) {
    const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: { id: props.body.categoryId, deleted_at: null },
    });
    if (category) {
      // Get all subcategories recursively
      const getSubcategories = async (parentId: string): Promise<string[]> => {
        const subcategories =
          await MyGlobal.prisma.ecommerce_mall_categories.findMany({
            where: { parent_id: parentId, deleted_at: null },
            select: { id: true },
          });
        let allIds = subcategories.map((c) => c.id);
        for (const sub of subcategories) {
          const childIds = await getSubcategories(sub.id);
          allIds = allIds.concat(childIds);
        }
        return allIds;
      };
      categoryIds = [category.id, ...(await getSubcategories(category.id))];
    }
  }
  // Build where conditions
  const whereConditions: Prisma.Enumerable<Prisma.ecommerce_mall_productsWhereInput> =
    [{ deleted_at: null }];
  // Text search on name (case-insensitive)
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    whereConditions.push({
      name: { contains: props.body.search, mode: "insensitive" },
    });
  }
  // Category filter (including subcategories)
  if (categoryIds !== undefined && categoryIds.length > 0) {
    whereConditions.push({
      ecommerce_mall_category_id: { in: categoryIds },
    });
  }
  // Price range filter
  if (props.body.minPrice !== undefined) {
    whereConditions.push({
      base_price: { gte: props.body.minPrice },
    });
  }
  if (props.body.maxPrice !== undefined) {
    whereConditions.push({
      base_price: { lte: props.body.maxPrice },
    });
  }
  // Stock availability filter
  if (props.body.inStock === true) {
    // Products must have at least one variant with quantity > 0 AND deleted_at IS NULL
    whereConditions.push({
      variants: {
        some: {
          quantity: { gt: 0 },
          deleted_at: null,
        },
      },
    });
  }
  // Sorting
  let orderBy: Prisma.Enumerable<Prisma.ecommerce_mall_productsOrderByWithRelationInput>;
  switch (props.body.sort) {
    case "price_asc":
      orderBy = { base_price: "asc" };
      break;
    case "price_desc":
      orderBy = { base_price: "desc" };
      break;
    case "newest":
    default:
      orderBy = { created_at: "desc" };
  }
  // Execute queries sequentially (NOT parallel for findMany + count)
  const data = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { AND: whereConditions },
    orderBy: orderBy,
    skip: skip,
    take: limit,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { AND: whereConditions },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductAtSummaryTransformer.transform,
    ),
  };
}
