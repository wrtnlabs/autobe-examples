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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for variant filtering
  const whereClause: Prisma.shopping_mall_product_variantsWhereInput = {
    shopping_mall_product_id: props.productId,
    deleted_at: null,
    ...(props.body.skuCode !== undefined && {
      sku_code: { contains: props.body.skuCode, mode: "insensitive" },
    }),
  };
  // Add option filters using AND with subqueries
  if (
    props.body.options !== undefined &&
    Object.keys(props.body.options).length > 0
  ) {
    const optionEntries = Object.entries(props.body.options);
    whereClause.AND = optionEntries.map(([key, value]) => ({
      options: {
        some: {
          key: key,
          value: value,
        },
      },
    }));
  }
  // Query variants with transformer select
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  // Transform to ISummary
  let transformedVariants = await ArrayUtil.asyncMap(
    variants,
    ShoppingMallProductVariantAtSummaryTransformer.transform,
  );
  // Post-filter by in_stock if requested
  if (props.body.inStock === true) {
    transformedVariants = transformedVariants.filter(
      (variant) => variant.in_stock === true,
    );
  }
  // Get total count for pagination (pre-filter count)
  const totalCount = await MyGlobal.prisma.shopping_mall_product_variants.count(
    {
      where: whereClause,
    },
  );
  return {
    data: transformedVariants,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
