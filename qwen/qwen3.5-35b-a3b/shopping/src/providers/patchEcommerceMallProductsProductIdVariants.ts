import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build where clause for product variants
  const whereClause: Prisma.ecommerce_mall_product_variantsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  // Apply active status filter
  if (props.body.is_active !== undefined) {
    whereClause.is_active = props.body.is_active;
  } else {
    // Default: only active variants for customer views
    whereClause.is_active = true;
  }
  // Apply SKU code filter (partial match)
  if (props.body.sku_code) {
    whereClause.sku_code = { contains: props.body.sku_code };
  }
  // Apply stock quantity filter
  if (props.body.stock_quantity !== undefined) {
    if (props.body.stock_quantity === 0) {
      whereClause.stock_quantity = 0;
    } else {
      whereClause.stock_quantity = { gte: props.body.stock_quantity };
    }
  }
  // Apply price range filters
  // Price is determined by price_override if set, otherwise parent product's base_price
  if (
    props.body.price_min !== undefined ||
    props.body.price_max !== undefined
  ) {
    const minPrice = props.body.price_min;
    const maxPrice = props.body.price_max;
    // Build conditions for both override and base price scenarios
    const overrideConditions: Prisma.ecommerce_mall_product_variantsWhereInput[] =
      [];
    if (minPrice !== undefined && maxPrice !== undefined) {
      overrideConditions.push({
        price_override: { not: null },
        AND: [
          { price_override: { gte: minPrice } },
          { price_override: { lte: maxPrice } },
        ],
      });
    } else if (minPrice !== undefined) {
      overrideConditions.push({
        price_override: { not: null },
        AND: [{ price_override: { gte: minPrice } }],
      });
    } else if (maxPrice !== undefined) {
      overrideConditions.push({
        price_override: { not: null },
        AND: [{ price_override: { lte: maxPrice } }],
      });
    }
    const basePriceConditions: Prisma.ecommerce_mall_product_variantsWhereInput[] =
      [];
    if (minPrice !== undefined && maxPrice !== undefined) {
      basePriceConditions.push({
        price_override: null,
        product: {
          AND: [
            { base_price: { gte: minPrice } },
            { base_price: { lte: maxPrice } },
          ],
        },
      });
    } else if (minPrice !== undefined) {
      basePriceConditions.push({
        price_override: null,
        product: {
          AND: [{ base_price: { gte: minPrice } }],
        },
      });
    } else if (maxPrice !== undefined) {
      basePriceConditions.push({
        price_override: null,
        product: {
          AND: [{ base_price: { lte: maxPrice } }],
        },
      });
    }
    // Combine override and base price conditions with AND
    whereClause.AND = [{ OR: [...overrideConditions, ...basePriceConditions] }];
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Order by
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput =
    props.body.order_by === "created_at"
      ? { created_at: "desc" as const }
      : props.body.order_by === "updated_at"
        ? { updated_at: "desc" as const }
        : props.body.order_by === "stock_quantity"
          ? { stock_quantity: "desc" as const }
          : props.body.order_by === "sku_code"
            ? { sku_code: "asc" as const }
            : { created_at: "desc" as const };
  // Fetch variants with product relationship
  const data = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallProductVariantAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereClause,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductVariantAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
