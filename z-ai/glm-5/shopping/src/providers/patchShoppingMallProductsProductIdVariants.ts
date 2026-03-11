import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Verify product exists and get base_price for price filtering
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, base_price: true },
    });
  // Query all variants for this product (filters applied after due to computed fields)
  const allVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        ...(props.body.includeDeleted !== true && { deleted_at: null }),
        ...(props.body.skuCode && {
          sku_code: {
            contains: props.body.skuCode,
            mode: "insensitive" as const,
          },
        }),
      },
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  // Transform to apply computed fields (stockQuantity)
  const transformedVariants = await ArrayUtil.asyncMap(
    allVariants,
    ShoppingMallProductVariantAtSummaryTransformer.transform,
  );
  // Apply filters for computed/aggregated fields
  let filteredVariants = transformedVariants;
  // Filter by stock availability
  if (props.body.inStock !== undefined) {
    filteredVariants = filteredVariants.filter((v) =>
      props.body.inStock ? v.stockQuantity > 0 : v.stockQuantity <= 0,
    );
  }
  // Filter by minimum price (use variant price or product base_price)
  if (props.body.minPrice !== undefined) {
    filteredVariants = filteredVariants.filter((v) => {
      const effectivePrice = v.price ?? product.base_price;
      return effectivePrice >= props.body.minPrice!;
    });
  }
  // Filter by maximum price (use variant price or product base_price)
  if (props.body.maxPrice !== undefined) {
    filteredVariants = filteredVariants.filter((v) => {
      const effectivePrice = v.price ?? product.base_price;
      return effectivePrice <= props.body.maxPrice!;
    });
  }
  // Sort the filtered results
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.direction ?? "desc";
  filteredVariants.sort((a, b) => {
    let comparison = 0;
    if (sortField === "sku_code") {
      comparison = a.skuCode.localeCompare(b.skuCode);
    } else if (sortField === "price") {
      const priceA = a.price ?? product.base_price;
      const priceB = b.price ?? product.base_price;
      comparison = priceA - priceB;
    } else {
      // created_at - compare as ISO strings
      comparison = a.createdAt.localeCompare(b.createdAt);
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const paginatedVariants = filteredVariants.slice(skip, skip + limit);
  // Calculate pagination metadata
  const totalRecords = filteredVariants.length;
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: paginatedVariants,
  };
}
