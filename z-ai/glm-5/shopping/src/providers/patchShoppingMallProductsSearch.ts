import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryAtSummaryTransformer } from "../transformers/ShoppingMallCategoryAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsSearch(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base where conditions for visibility
  const whereConditions: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      deleted_at: null,
      suspended: false,
      banned: false,
      approval_status: "approved",
    },
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Search filter - partial matching on product name
  if (props.body.search !== undefined && props.body.search !== "") {
    whereConditions.name = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  // Category filter with subcategories
  if (props.body.categoryId !== undefined) {
    const childCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: {
          parent_id: props.body.categoryId,
          deleted_at: null,
        },
        select: { id: true },
      });
    const categoryIds = [
      props.body.categoryId,
      ...childCategories.map((c) => c.id),
    ];
    whereConditions.shopping_mall_category_id = {
      in: categoryIds,
    } satisfies Prisma.StringFilter;
  }
  // Price range filter
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    whereConditions.base_price = {
      ...(props.body.minPrice !== undefined && { gte: props.body.minPrice }),
      ...(props.body.maxPrice !== undefined && { lte: props.body.maxPrice }),
    } satisfies Prisma.FloatFilter;
  }
  // In-stock filter - check if any variant has stock > 0
  if (props.body.inStockOnly === true) {
    // Get product IDs that have in-stock variants
    const inStockProductIds = await MyGlobal.prisma.$queryRaw<
      Array<{
        product_id: string;
      }>
    >`
      SELECT DISTINCT pv.shopping_mall_product_id AS product_id
      FROM shopping_mall_product_variants pv
      LEFT JOIN shopping_mall_inventory_records ir ON ir.variant_id = pv.id
      WHERE pv.deleted_at IS NULL
      GROUP BY pv.shopping_mall_product_id, pv.id
      HAVING COALESCE(SUM(ir.quantity_change), 0) > 0
    `;
    const productIds = inStockProductIds.map((p) => p.product_id);
    whereConditions.id = { in: productIds };
  }
  // Determine sorting
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.shopping_mall_productsOrderByWithRelationInput =
    sortBy === "price"
      ? { base_price: sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: sortOrder === "asc" ? "asc" : "desc" };
  // Query products with related data
  const products = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      name: true,
      base_price: true,
      created_at: true,
      category: ShoppingMallCategoryAtSummaryTransformer.select(),
      seller: ShoppingMallSellerAtSummaryTransformer.select(),
      images: {
        select: {
          image_url: true,
          display_order: true,
        },
        orderBy: { display_order: "asc" as const },
      } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereConditions,
  });
  // Transform results using transformers for nested objects
  const data = await ArrayUtil.asyncMap(products, async (product) => {
    const primaryImage =
      product.images.length > 0 ? product.images[0].image_url : null;
    return {
      id: product.id,
      name: product.name,
      base_price: product.base_price,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        product.category,
      ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        product.seller,
      ),
      primary_image: primaryImage,
      created_at: product.created_at.toISOString(),
    } satisfies IShoppingMallProduct.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProduct.ISummary;
}
