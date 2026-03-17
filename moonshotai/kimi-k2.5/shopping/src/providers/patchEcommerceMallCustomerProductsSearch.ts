import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerProductsSearch(props: {
  customer: CustomerPayload;
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base WHERE conditions
  const baseWhere: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Apply name filter with ILIKE for partial matching
  if (props.body.name !== null && props.body.name !== undefined) {
    baseWhere.name = { contains: props.body.name, mode: "insensitive" };
  }
  // Apply category filter
  if (props.body.categoryId !== null && props.body.categoryId !== undefined) {
    baseWhere.category_id = props.body.categoryId;
  }
  // Build complete where clause with additional filters
  let whereInput: Prisma.ecommerce_mall_productsWhereInput = baseWhere;
  // Apply price range filters by checking if any variant matches
  const variantFilters: Prisma.ecommerce_mall_product_variantsWhereInput[] = [];
  if (props.body.minPrice !== null && props.body.minPrice !== undefined) {
    variantFilters.push({
      OR: [
        { price: { gte: props.body.minPrice } },
        { product: { base_price: { gte: props.body.minPrice } } },
      ],
    });
  }
  if (props.body.maxPrice !== null && props.body.maxPrice !== undefined) {
    variantFilters.push({
      OR: [
        { price: { lte: props.body.maxPrice } },
        { product: { base_price: { lte: props.body.maxPrice } } },
      ],
    });
  }
  // Apply stock availability filter
  if (props.body.inStockOnly === true) {
    variantFilters.push({
      inventoryRecords: {
        some: {
          quantity_change: { gt: 0 },
        },
      },
    });
  }
  // Build complex where if variant filters exist
  if (variantFilters.length > 0) {
    whereInput = {
      ...baseWhere,
      variants: {
        some: {
          deleted_at: null,
          AND: variantFilters,
        },
      },
    };
  }
  // Determine order by based on sort parameter
  let orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput;
  const sortParam = props.body.sort ?? "newest";
  if (sortParam === "price_asc") {
    orderBy = { base_price: "asc" };
  } else if (sortParam === "price_desc") {
    orderBy = { base_price: "desc" };
  } else {
    // 'newest' - sort by created_at descending
    orderBy = { created_at: "desc" };
  }
  // Execute count query first
  const total = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereInput,
  });
  // Execute findMany with transformer select
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  // Transform results
  const transformedProducts = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  return {
    data: transformedProducts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
