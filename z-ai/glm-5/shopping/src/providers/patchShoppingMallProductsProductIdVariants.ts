import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Validate product exists
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Build base where clause
  const whereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.search && {
      sku_code: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.shopping_mall_product_variantsWhereInput;
  // Fetch all matching variants (needed for stock-based filtering/sorting)
  const allVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereInput,
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  // Transform to get computed values (including stock_quantity)
  const transformedVariants = await ArrayUtil.asyncMap(
    allVariants,
    ShoppingMallProductVariantAtSummaryTransformer.transform,
  );
  // Create array with computed stock for filtering/sorting
  const variantsWithStock = allVariants.map((variant, index) => ({
    original: variant,
    transformed: transformedVariants[index],
    stock: transformedVariants[index].stock_quantity,
  }));
  // Apply stock status filter
  let filteredVariants = variantsWithStock;
  if (props.body.stockStatus === "in_stock") {
    filteredVariants = variantsWithStock.filter((v) => v.stock > 0);
  } else if (props.body.stockStatus === "out_of_stock") {
    filteredVariants = variantsWithStock.filter((v) => v.stock <= 0);
  }
  // Apply sorting
  const sortedVariants = [...filteredVariants].sort((a, b) => {
    switch (props.body.sort) {
      case "created_at_asc":
        return (
          a.original.created_at.getTime() - b.original.created_at.getTime()
        );
      case "stock_asc":
        return a.stock - b.stock;
      case "stock_desc":
        return b.stock - a.stock;
      case "product_name_asc":
        return a.transformed.product.name.localeCompare(
          b.transformed.product.name,
        );
      case "product_name_desc":
        return b.transformed.product.name.localeCompare(
          a.transformed.product.name,
        );
      case "created_at_desc":
      default:
        return (
          b.original.created_at.getTime() - a.original.created_at.getTime()
        );
    }
  });
  // Apply pagination
  const total = sortedVariants.length;
  const skip = (page - 1) * limit;
  const paginatedVariants = sortedVariants.slice(skip, skip + limit);
  return {
    data: paginatedVariants.map((v) => v.transformed),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
