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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerInventorySummary(props: {
  seller: SellerPayload;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions for base filtering
  const whereConditions: Prisma.shopping_mall_product_variantsWhereInput = {
    deleted_at: null,
    product: {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  };
  // Product ID filter
  if (props.body.productId !== undefined) {
    whereConditions.shopping_mall_product_id = props.body.productId;
  }
  // Search filter - SKU code or product name (case-insensitive)
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    const searchTerm = props.body.search.trim();
    whereConditions.OR = [
      { sku_code: { contains: searchTerm, mode: "insensitive" } },
      { product: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }
  // Fetch all matching variants (need all for stock calculation)
  const allVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereConditions,
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  // Calculate stock for each variant and apply stock status filter
  let processedVariants = allVariants.map((variant) => {
    const stockQuantity = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return { variant, stockQuantity };
  });
  // Apply stock status filter
  if (props.body.stockStatus === "in_stock") {
    processedVariants = processedVariants.filter((v) => v.stockQuantity > 0);
  } else if (props.body.stockStatus === "out_of_stock") {
    processedVariants = processedVariants.filter((v) => v.stockQuantity <= 0);
  }
  // Apply sorting
  if (props.body.sort === "created_at_asc") {
    processedVariants.sort(
      (a, b) => a.variant.created_at.getTime() - b.variant.created_at.getTime(),
    );
  } else if (props.body.sort === "stock_asc") {
    processedVariants.sort((a, b) => a.stockQuantity - b.stockQuantity);
  } else if (props.body.sort === "stock_desc") {
    processedVariants.sort((a, b) => b.stockQuantity - a.stockQuantity);
  } else if (props.body.sort === "product_name_asc") {
    processedVariants.sort((a, b) =>
      a.variant.product.name.localeCompare(b.variant.product.name),
    );
  } else if (props.body.sort === "product_name_desc") {
    processedVariants.sort((a, b) =>
      b.variant.product.name.localeCompare(a.variant.product.name),
    );
  } else {
    // Default: created_at_desc
    processedVariants.sort(
      (a, b) => b.variant.created_at.getTime() - a.variant.created_at.getTime(),
    );
  }
  // Calculate pagination metadata
  const total = processedVariants.length;
  const paginatedVariants = processedVariants.slice(skip, skip + limit);
  // Transform to DTOs
  const data = await Promise.all(
    paginatedVariants.map((v) =>
      ShoppingMallProductVariantAtSummaryTransformer.transform(v.variant),
    ),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
